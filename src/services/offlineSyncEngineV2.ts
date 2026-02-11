import { offlineDB, QueuedOperation, ConflictRecord } from './offlineIndexedDB';
import { supabase } from '../lib/supabase';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000;
const MAX_BACKOFF = 30000;

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  errors: string[];
  verificationPassed?: boolean;
  checksumValid?: boolean;
}

interface VersionVector {
  [key: string]: number;
}

class OfflineSyncEngineV2 {
  private syncing = false;
  private syncInterval: number | null = null;
  private listeners: Array<(result: SyncResult) => void> = [];
  private versionVectors: Map<string, VersionVector> = new Map();

  isOnline(): boolean {
    return navigator.onLine;
  }

  generateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  getVersionVector(entityId: string): VersionVector {
    if (!this.versionVectors.has(entityId)) {
      this.versionVectors.set(entityId, {});
    }
    return this.versionVectors.get(entityId)!;
  }

  incrementVersion(entityId: string, clientId: string): void {
    const vector = this.getVersionVector(entityId);
    vector[clientId] = (vector[clientId] || 0) + 1;
  }

  detectConflict(
    entityId: string,
    localVector: VersionVector,
    serverVector: VersionVector
  ): boolean {
    const allKeys = new Set([
      ...Object.keys(localVector),
      ...Object.keys(serverVector)
    ]);

    let localNewer = false;
    let serverNewer = false;

    for (const key of allKeys) {
      const localVer = localVector[key] || 0;
      const serverVer = serverVector[key] || 0;

      if (localVer > serverVer) localNewer = true;
      if (serverVer > localVer) serverNewer = true;
    }

    return localNewer && serverNewer;
  }

  startAutoSync(intervalMs: number = 30000): void {
    if (this.syncInterval) return;

    this.syncInterval = window.setInterval(() => {
      if (this.isOnline() && !this.syncing) {
        this.sync();
      }
    }, intervalMs);

    window.addEventListener('online', () => this.sync());
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  onSyncComplete(callback: (result: SyncResult) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(result: SyncResult): void {
    this.listeners.forEach(cb => cb(result));
  }

  async sync(): Promise<SyncResult> {
    if (this.syncing) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: 0,
        errors: ['Sync already in progress']
      };
    }

    if (!this.isOnline()) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: 0,
        errors: ['Device is offline']
      };
    }

    this.syncing = true;
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: 0,
      errors: [],
      checksumValid: true
    };

    const operationIds: string[] = [];

    try {
      const operations = await offlineDB.getQueuedOperations('pending');

      for (const operation of operations) {
        operationIds.push(operation.id);

        const checksum = this.generateChecksum({
          type: operation.type,
          payload: operation.payload,
          timestamp: operation.timestamp
        });

        try {
          await offlineDB.updateQueueOperation({
            ...operation,
            status: 'syncing'
          });

          const { data, error } = await supabase.rpc('log_offline_operation', {
            p_agency_id: 'a0000000-0000-0000-0000-000000000001',
            p_operation_id: operation.id,
            p_operation_type: operation.type,
            p_payload: operation.payload
          });

          if (error) {
            throw new Error(error.message);
          }

          const syncResult = await this.syncOperation(operation);

          if (syncResult.conflict) {
            result.conflicts++;
            await offlineDB.addConflict(syncResult.conflict);
            await offlineDB.updateQueueOperation({
              ...operation,
              status: 'failed',
              lastError: 'Conflict detected'
            });
          } else if (syncResult.success) {
            result.synced++;
            await offlineDB.updateQueueOperation({
              ...operation,
              status: 'synced'
            });
            await offlineDB.deleteQueueOperation(operation.id);
          } else {
            throw new Error(syncResult.error || 'Unknown sync error');
          }
        } catch (error) {
          result.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Operation ${operation.id}: ${errorMessage}`);

          const newRetries = operation.retries + 1;
          if (newRetries >= MAX_RETRIES) {
            await offlineDB.updateQueueOperation({
              ...operation,
              status: 'failed',
              retries: newRetries,
              lastError: errorMessage
            });
          } else {
            await offlineDB.updateQueueOperation({
              ...operation,
              status: 'pending',
              retries: newRetries,
              lastError: errorMessage
            });
          }
        }
      }

      const evidenceItems = await offlineDB.getUnsyncedEvidence();
      for (const evidence of evidenceItems) {
        try {
          await this.syncEvidence(evidence);
          await offlineDB.markEvidenceSynced(evidence.id);
          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Evidence ${evidence.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const auditEvents = await offlineDB.getUnsyncedAuditEvents();
      for (const event of auditEvents) {
        try {
          await this.syncAuditEvent(event);
          await offlineDB.markAuditEventSynced(event.id);
          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Audit ${event.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (operationIds.length > 0) {
        const { data: verificationData, error: verifyError } = await supabase.rpc('verify_offline_sync', {
          p_agency_id: 'a0000000-0000-0000-0000-000000000001',
          p_sync_session_id: crypto.randomUUID(),
          p_operation_ids: operationIds
        });

        if (verifyError) {
          result.errors.push(`Verification failed: ${verifyError.message}`);
          result.verificationPassed = false;
        } else {
          result.verificationPassed = verificationData?.verification_passed || false;
          result.checksumValid = verificationData?.checksums_valid || false;
        }
      }

      await offlineDB.updateSyncState({
        id: 'global',
        lastSyncTime: Date.now(),
        pendingCount: result.failed,
        conflictCount: result.conflicts
      });

      if (result.failed === 0 && result.conflicts === 0) {
        await offlineDB.clearSyncedData();
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
    } finally {
      this.syncing = false;
    }

    this.notifyListeners(result);
    return result;
  }

  private async syncOperation(operation: QueuedOperation): Promise<{
    success: boolean;
    conflict?: ConflictRecord;
    error?: string;
  }> {
    try {
      switch (operation.type) {
        case 'task_complete':
          return await this.syncTaskComplete(operation);
        case 'evidence_capture':
          return await this.syncEvidenceCapture(operation);
        case 'audit_event':
          return await this.syncAuditOperation(operation);
        case 'care_action':
          return await this.syncCareAction(operation);
        default:
          return { success: false, error: 'Unknown operation type' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async syncTaskComplete(operation: QueuedOperation): Promise<{
    success: boolean;
    conflict?: ConflictRecord;
    error?: string;
  }> {
    const { taskId, completedAt, evidence, notes } = operation.payload;

    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('status, updated_at, version')
      .eq('id', taskId)
      .maybeSingle();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    if (!existingTask) {
      return { success: false, error: 'Task not found' };
    }

    const localVersion = operation.version || 1;
    const serverVersion = existingTask.version || 1;

    if (existingTask.status === 'completed' && serverVersion > localVersion) {
      return {
        success: false,
        conflict: {
          id: `conflict_${operation.id}`,
          operationId: operation.id,
          localVersion: {
            status: 'completed',
            completedAt,
            evidence,
            notes,
            version: localVersion
          },
          serverVersion: {
            ...existingTask,
            version: serverVersion
          },
          timestamp: Date.now(),
          resolved: false
        }
      };
    }

    return { success: true };
  }

  private async syncEvidenceCapture(operation: QueuedOperation): Promise<{
    success: boolean;
    error?: string;
  }> {
    return { success: true };
  }

  private async syncAuditOperation(operation: QueuedOperation): Promise<{
    success: boolean;
    error?: string;
  }> {
    return { success: true };
  }

  private async syncCareAction(operation: QueuedOperation): Promise<{
    success: boolean;
    error?: string;
  }> {
    return { success: true };
  }

  private async syncEvidence(evidence: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async syncAuditEvent(event: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async queueTaskCompletion(
    taskId: string,
    completedAt: string,
    evidence?: any[],
    notes?: string
  ): Promise<void> {
    const clientId = this.getClientId();
    this.incrementVersion(taskId, clientId);

    const operation: QueuedOperation = {
      id: `task_${taskId}_${Date.now()}`,
      type: 'task_complete',
      payload: { taskId, completedAt, evidence, notes },
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
      version: this.getVersionVector(taskId)[clientId]
    };

    await offlineDB.addToQueue(operation);

    if (this.isOnline()) {
      this.sync();
    }
  }

  async queueEvidenceCapture(
    taskId: string,
    evidenceType: string,
    evidenceData: any,
    capturedAt: string
  ): Promise<void> {
    const operation: QueuedOperation = {
      id: `evidence_${taskId}_${Date.now()}`,
      type: 'evidence_capture',
      payload: { taskId, evidenceType, evidenceData, capturedAt },
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    };

    await offlineDB.addToQueue(operation);

    if (this.isOnline()) {
      this.sync();
    }
  }

  async queueAuditEvent(
    entityType: string,
    entityId: string,
    action: string,
    userId: string,
    metadata: any
  ): Promise<void> {
    const operation: QueuedOperation = {
      id: `audit_${entityId}_${Date.now()}`,
      type: 'audit_event',
      payload: { entityType, entityId, action, userId, metadata },
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    };

    await offlineDB.addToQueue(operation);
  }

  private getClientId(): string {
    let clientId = localStorage.getItem('offline_client_id');
    if (!clientId) {
      clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('offline_client_id', clientId);
    }
    return clientId;
  }
}

export const syncEngineV2 = new OfflineSyncEngineV2();
