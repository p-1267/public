import { useState, useEffect } from 'react';
import { connectivityService, ConnectivityStatus } from '../services/connectivity';

export function useConnectivity(): ConnectivityStatus {
  const [status, setStatus] = useState<ConnectivityStatus>(
    connectivityService.getStatus()
  );

  useEffect(() => {
    connectivityService.initialize();
    const unsubscribe = connectivityService.subscribe(setStatus);
    return unsubscribe;
  }, []);

  return status;
}
