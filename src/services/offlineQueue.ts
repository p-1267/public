export type ActionType =
  | 'UPDATE_CARE_STATE'
  | 'UPDATE_EMERGENCY_STATE'
  | 'UPDATE_OFFLINE_ONLINE_STATE';

export interface QueuedAction {
  id: string;
  type: ActionType;
  payload: Record<string, unknown>;
  expectedVersion: number;
  timestamp: number;
  retryCount: number;
}

type QueueListener = (actions: QueuedAction[]) => void;

const DB_NAME = 'brain-shell-offline';
const DB_VERSION = 1;
const STORE_NAME = 'action-queue';

class OfflineQueueService {
  private db: IDBDatabase | null = null;
  private listeners: Set<QueueListener> = new Set();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  async enqueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    await this.ensureInitialized();

    const queuedAction: QueuedAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(queuedAction);

      request.onsuccess = () => {
        this.notifyListeners();
        resolve(queuedAction.id);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async dequeue(id: string): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        this.notifyListeners();
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getAll(): Promise<QueuedAction[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async peek(): Promise<QueuedAction | null> {
    const actions = await this.getAll();
    return actions[0] || null;
  }

  async incrementRetry(id: string): Promise<void> {
    await this.ensureInitialized();

    const action = await this.get(id);
    if (!action) return;

    action.retryCount += 1;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(action);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        this.notifyListeners();
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async count(): Promise<number> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    this.getAll().then(actions => listener(actions));
    return () => this.listeners.delete(listener);
  }

  private async get(id: string): Promise<QueuedAction | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async notifyListeners(): Promise<void> {
    const actions = await this.getAll();
    this.listeners.forEach(listener => listener(actions));
  }
}

export const offlineQueueService = new OfflineQueueService();
