import { supabase } from '../lib/supabase';

export type ConnectivityStatus = 'online' | 'offline' | 'reconnecting';

type ConnectivityListener = (status: ConnectivityStatus) => void;

class ConnectivityService {
  private status: ConnectivityStatus = 'online';
  private listeners: Set<ConnectivityListener> = new Set();
  private realtimeConnected = false;
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.status = navigator.onLine ? 'online' : 'offline';

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    this.monitorRealtimeConnection();
  }

  private handleOnline = (): void => {
    if (this.realtimeConnected) {
      this.updateStatus('online');
    } else {
      this.updateStatus('reconnecting');
    }
  };

  private handleOffline = (): void => {
    this.updateStatus('offline');
  };

  private monitorRealtimeConnection(): void {
    const channel = supabase.channel('connectivity-monitor');

    channel
      .on('system', { event: 'connected' }, () => {
        this.realtimeConnected = true;
        if (navigator.onLine) {
          this.updateStatus('online');
        }
      })
      .on('system', { event: 'disconnected' }, () => {
        this.realtimeConnected = false;
        if (navigator.onLine) {
          this.updateStatus('reconnecting');
        }
      })
      .subscribe();
  }

  private updateStatus(newStatus: ConnectivityStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.status));
  }

  getStatus(): ConnectivityStatus {
    return this.status;
  }

  subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isOnline(): boolean {
    return this.status === 'online';
  }

  destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners.clear();
    this.initialized = false;
  }
}

export const connectivityService = new ConnectivityService();
