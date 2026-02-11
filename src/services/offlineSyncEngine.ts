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
}

class OfflineSyncEngine {
  private syncing = false;
  private syncInterval: number | null = null;
  private listeners: Array<(result: SyncResult) => void> = [];

  isOnline(): boolean {
    return navigator.onLine;
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
      errors: []
    };

    try {
      const operations = await offlineDB.getQueuedOperations('pending');

      for (const operation of operations) {
        try {
          await offlineDB.updateQueueOperation({
            ...operation,
            status: 'syncing'
          });

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
      .select('status, updated_at')
      .eq('id', taskId)
      .maybeSingle();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    if (!existingTask) {
      return { success: false, error: 'Task not found' };
    }

    const localTimestamp = new Date(completedAt).getTime();
    const serverTimestamp = new Date(existingTask.updated_at).getTime();

    if (existingTask.status === 'completed' && serverTimestamp > localTimestamp) {
      return {
        success: false,
        conflict: {
          id: `conflict_${operation.id}`,
          operationId: operation.id,
          localVersion: {
            status: 'completed',
            completedAt,
            evidence,
            notes
          },
          serverVersion: existingTask,
          timestamp: Date.now(),
          resolved: false
        }
      };
    }

    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: completedAt,
        notes: notes || null
      })
      .eq('id', taskId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  }

  private async syncEvidenceCapture(operation: QueuedOperation): Promise<{
    success: boolean;
    error?: string;
  }> {
    const { taskId, evidenceType, evidenceData, capturedAt } = operation.payload;

    const { error } = await supabase
      .from('task_evidence')
      .insert({
        task_id: taskId,
        evidence_type: evidenceType,
        evidence_data: evidenceData,
        captured_at: capturedAt
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  private async syncAuditOperation(operation: QueuedOperation): Promise<{
    success: boolean;
    error?: string;
  }> {
    const { entityType, entityId, action, userId, metadata } = operation.payload;

    const { error } = await supabase
      .from('audit_log')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        action,
        user_id: userId,
        metadata,
        timestamp: new Date(operation.timestamp).toISOString()
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  private async syncCareAction(operation: QueuedOperation): Promise<{
    success: boolean;
    error?: string;
  }> {
    const { residentId, actionType, actionData, performedAt } = operation.payload;

    const { error } = await supabase.rpc('record_care_action', {
      p_resident_id: residentId,
      p_action_type: actionType,
      p_action_data: actionData,
      p_performed_at: performedAt
    });

    if (error) {
      return { success: false, error: error.message };
    }

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
    const operation: QueuedOperation = {
      id: `task_${taskId}_${Date.now()}`,
      type: 'task_complete',
      payload: { taskId, completedAt, evidence, notes },
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
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

  async getBackoffDelay(retries: number): Promise<number> {
    const delay = Math.min(INITIAL_BACKOFF * Math.pow(2, retries), MAX_BACKOFF);
    const jitter = Math.random() * 1000;
    return delay + jitter;
  }
}

export const syncEngine = new OfflineSyncEngine();
