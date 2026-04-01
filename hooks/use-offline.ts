import { offlineService, PendingTransaction, SyncStatus } from '@/lib/offline';
import { supabase } from '@/lib/supabase';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useCallback, useEffect, useState } from 'react';

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const status = await offlineService.getSyncStatus(user.id);
    const pending = await offlineService.getPendingTransactions(user.id);
    
    setSyncStatus(status);
    setPendingCount(pending.length);
  }, []);

  const syncNow = useCallback(async () => {
    setIsLoading(true);
    try {
      await offlineService.syncPendingTransactions();
      await refreshStatus();
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  const queueTransaction = useCallback(async (
    transaction: Omit<PendingTransaction, 'id' | 'createdAt' | 'retryCount'>
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const success = await offlineService.queueTransaction(user.id, transaction);
    if (success) {
      await refreshStatus();
    }
    return success;
  }, [refreshStatus]);

  useEffect(() => {
    // Initial check
    NetInfo.fetch().then((state: NetInfoState) => setIsOnline(state.isConnected ?? false));
    refreshStatus();

    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? false);
      if (state.isConnected) {
        // Auto-sync when coming back online
        syncNow();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [refreshStatus, syncNow]);

  return {
    isOnline,
    syncStatus,
    pendingCount,
    isLoading,
    syncNow,
    queueTransaction,
    refreshStatus,
  };
}
