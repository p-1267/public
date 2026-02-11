const DB_NAME = 'CareSystemOfflineDB';
const DB_VERSION = 1;

const STORES = {
  QUEUE: 'offline_queue',
  EVIDENCE: 'offline_evidence',
  AUDIT: 'offline_audit',
  SYNC_STATE: 'sync_state',
  CONFLICTS: 'conflicts'
};

export interface QueuedOperation {
  id: string;
  type: 'task_complete' | 'evidence_capture' | 'audit_event' | 'care_action';
  payload: any;
  timestamp: number;
  retries: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  version?: number;
}

export interface OfflineEvidence {
  id: string;
  taskId: string;
  type: 'photo' | 'audio' | 'numeric' | 'text';
  data: string;
  timestamp: number;
  synced: boolean;
}

export interface OfflineAuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  timestamp: number;
  metadata: any;
  synced: boolean;
}

export interface SyncState {
  id: string;
  lastSyncTime: number;
  pendingCount: number;
  conflictCount: number;
}

export interface ConflictRecord {
  id: string;
  operationId: string;
  localVersion: any;
  serverVersion: any;
  timestamp: number;
  resolved: boolean;
  resolution?: 'local' | 'server' | 'merged';
  resolvedAt?: number;
}

class OfflineIndexedDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORES.QUEUE)) {
          const queueStore = db.createObjectStore(STORES.QUEUE, { keyPath: 'id' });
          queueStore.createIndex('status', 'status');
          queueStore.createIndex('timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains(STORES.EVIDENCE)) {
          const evidenceStore = db.createObjectStore(STORES.EVIDENCE, { keyPath: 'id' });
          evidenceStore.createIndex('taskId', 'taskId');
          evidenceStore.createIndex('synced', 'synced');
        }

        if (!db.objectStoreNames.contains(STORES.AUDIT)) {
          const auditStore = db.createObjectStore(STORES.AUDIT, { keyPath: 'id' });
          auditStore.createIndex('synced', 'synced');
          auditStore.createIndex('timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_STATE)) {
          db.createObjectStore(STORES.SYNC_STATE, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
          const conflictStore = db.createObjectStore(STORES.CONFLICTS, { keyPath: 'id' });
          conflictStore.createIndex('resolved', 'resolved');
          conflictStore.createIndex('timestamp', 'timestamp');
        }
      };
    });

    return this.initPromise;
  }

  async addToQueue(operation: QueuedOperation): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.QUEUE);
      const request = store.add(operation);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getQueuedOperations(status?: string): Promise<QueuedOperation[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.QUEUE], 'readonly');
      const store = transaction.objectStore(STORES.QUEUE);

      let request: IDBRequest;
      if (status) {
        const index = store.index('status');
        request = index.getAll(status);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateQueueOperation(operation: QueuedOperation): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.QUEUE);
      const request = store.put(operation);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteQueueOperation(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.QUEUE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addEvidence(evidence: OfflineEvidence): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EVIDENCE], 'readwrite');
      const store = transaction.objectStore(STORES.EVIDENCE);
      const request = store.add(evidence);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUnsyncedEvidence(): Promise<OfflineEvidence[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EVIDENCE], 'readonly');
      const store = transaction.objectStore(STORES.EVIDENCE);
      const index = store.index('synced');
      const request = index.getAll(false);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async markEvidenceSynced(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EVIDENCE], 'readwrite');
      const store = transaction.objectStore(STORES.EVIDENCE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const evidence = getRequest.result;
        if (evidence) {
          evidence.synced = true;
          const updateRequest = store.put(evidence);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async addAuditEvent(event: OfflineAuditEvent): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.AUDIT], 'readwrite');
      const store = transaction.objectStore(STORES.AUDIT);
      const request = store.add(event);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUnsyncedAuditEvents(): Promise<OfflineAuditEvent[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.AUDIT], 'readonly');
      const store = transaction.objectStore(STORES.AUDIT);
      const index = store.index('synced');
      const request = index.getAll(false);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async markAuditEventSynced(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.AUDIT], 'readwrite');
      const store = transaction.objectStore(STORES.AUDIT);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const event = getRequest.result;
        if (event) {
          event.synced = true;
          const updateRequest = store.put(event);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getSyncState(): Promise<SyncState | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SYNC_STATE], 'readonly');
      const store = transaction.objectStore(STORES.SYNC_STATE);
      const request = store.get('global');

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncState(state: SyncState): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SYNC_STATE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_STATE);
      const request = store.put(state);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addConflict(conflict: ConflictRecord): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CONFLICTS], 'readwrite');
      const store = transaction.objectStore(STORES.CONFLICTS);
      const request = store.add(conflict);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUnresolvedConflicts(): Promise<ConflictRecord[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CONFLICTS], 'readonly');
      const store = transaction.objectStore(STORES.CONFLICTS);
      const index = store.index('resolved');
      const request = index.getAll(false);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async resolveConflict(id: string, resolution: 'local' | 'server' | 'merged'): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CONFLICTS], 'readwrite');
      const store = transaction.objectStore(STORES.CONFLICTS);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const conflict = getRequest.result;
        if (conflict) {
          conflict.resolved = true;
          conflict.resolution = resolution;
          conflict.resolvedAt = Date.now();
          const updateRequest = store.put(conflict);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async clearSyncedData(): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORES.QUEUE, STORES.EVIDENCE, STORES.AUDIT],
        'readwrite'
      );

      const queueStore = transaction.objectStore(STORES.QUEUE);
      const evidenceStore = transaction.objectStore(STORES.EVIDENCE);
      const auditStore = transaction.objectStore(STORES.AUDIT);

      const queueIndex = queueStore.index('status');
      const evidenceIndex = evidenceStore.index('synced');
      const auditIndex = auditStore.index('synced');

      queueIndex.openCursor(IDBKeyRange.only('synced')).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      evidenceIndex.openCursor(IDBKeyRange.only(true)).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      auditIndex.openCursor(IDBKeyRange.only(true)).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getStats(): Promise<{
    queuedOperations: number;
    unsyncedEvidence: number;
    unsyncedAudit: number;
    unresolvedConflicts: number;
  }> {
    await this.init();

    const [queued, evidence, audit, conflicts] = await Promise.all([
      this.getQueuedOperations('pending'),
      this.getUnsyncedEvidence(),
      this.getUnsyncedAuditEvents(),
      this.getUnresolvedConflicts()
    ]);

    return {
      queuedOperations: queued.length,
      unsyncedEvidence: evidence.length,
      unsyncedAudit: audit.length,
      unresolvedConflicts: conflicts.length
    };
  }
}

export const offlineDB = new OfflineIndexedDB();
