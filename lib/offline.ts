import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from './supabase';

const PENDING_TRANSACTIONS_KEY = 'pending_transactions';
const SYNC_STATUS_KEY = 'sync_status';

export interface PendingTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note?: string;
  date: string;
  createdAt: number;
  retryCount: number;
}

export interface SyncStatus {
  lastSync: string | null;
  pendingCount: number;
  isSyncing: boolean;
  lastError: string | null;
}

class OfflineService {
  private unsubscribeNetInfo: (() => void) | null = null;

  async init() {
    // Listen for network status changes
    this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected) {
        this.syncPendingTransactions();
      }
    });

    // Initial sync attempt
    const state = await NetInfo.fetch();
    if (state.isConnected) {
      this.syncPendingTransactions();
    }
  }

  destroy() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }
  }

  // Queue a transaction when offline
  async queueTransaction(
    userId: string,
    transaction: Omit<PendingTransaction, 'id' | 'createdAt' | 'retryCount'>
  ): Promise<boolean> {
    try {
      const pending = await this.getPendingTransactions(userId);
      const newPending: PendingTransaction = {
        ...transaction,
        id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        retryCount: 0,
      };

      pending.push(newPending);
      await AsyncStorage.setItem(
        `${PENDING_TRANSACTIONS_KEY}_${userId}`,
        JSON.stringify(pending)
      );

      await this.updateSyncStatus(userId, {
        pendingCount: pending.length,
      });

      // Try to sync immediately if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        this.syncPendingTransactions(userId);
      }

      return true;
    } catch (error) {
      console.error('Failed to queue transaction:', error);
      return false;
    }
  }

  // Get all pending transactions
  async getPendingTransactions(userId: string): Promise<PendingTransaction[]> {
    try {
      const data = await AsyncStorage.getItem(`${PENDING_TRANSACTIONS_KEY}_${userId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // Get sync status
  async getSyncStatus(userId: string): Promise<SyncStatus> {
    try {
      const data = await AsyncStorage.getItem(`${SYNC_STATUS_KEY}_${userId}`);
      return (
        data
          ? JSON.parse(data)
          : {
              lastSync: null,
              pendingCount: 0,
              isSyncing: false,
              lastError: null,
            }
      );
    } catch {
      return {
        lastSync: null,
        pendingCount: 0,
        isSyncing: false,
        lastError: null,
      };
    }
  }

  private async updateSyncStatus(
    userId: string,
    updates: Partial<SyncStatus>
  ): Promise<void> {
    const current = await this.getSyncStatus(userId);
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(`${SYNC_STATUS_KEY}_${userId}`, JSON.stringify(updated));
  }

  // Sync pending transactions to Supabase
  async syncPendingTransactions(userId?: string): Promise<{
    synced: number;
    failed: number;
  }> {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!targetUserId) return { synced: 0, failed: 0 };

    await this.updateSyncStatus(targetUserId, { isSyncing: true, lastError: null });

    try {
      const pending = await this.getPendingTransactions(targetUserId);
      if (pending.length === 0) {
        await this.updateSyncStatus(targetUserId, { isSyncing: false });
        return { synced: 0, failed: 0 };
      }

      let synced = 0;
      let failed = 0;
      const remaining: PendingTransaction[] = [];

      for (const transaction of pending) {
        try {
          const { error } = await supabase.from('transactions').insert({
            user_id: targetUserId,
            type: transaction.type,
            amount: transaction.amount,
            category: transaction.category,
            note: transaction.note,
            date: transaction.date,
          });

          if (error) throw error;
          synced++;
        } catch (error) {
          failed++;
          transaction.retryCount++;
          // Keep for retry if under 5 attempts
          if (transaction.retryCount < 5) {
            remaining.push(transaction);
          }
        }
      }

      // Update pending list with remaining items
      await AsyncStorage.setItem(
        `${PENDING_TRANSACTIONS_KEY}_${targetUserId}`,
        JSON.stringify(remaining)
      );

      await this.updateSyncStatus(targetUserId, {
        lastSync: new Date().toISOString(),
        pendingCount: remaining.length,
        isSyncing: false,
        lastError: failed > 0 ? `${failed} transactions failed to sync` : null,
      });

      return { synced, failed };
    } catch (error: any) {
      await this.updateSyncStatus(targetUserId, {
        isSyncing: false,
        lastError: error.message,
      });
      return { synced: 0, failed: 0 };
    }
  }

  // Check if device is online
  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  // Clear all pending data (use with caution)
  async clearPending(userId: string): Promise<void> {
    await AsyncStorage.removeItem(`${PENDING_TRANSACTIONS_KEY}_${userId}`);
    await this.updateSyncStatus(userId, { pendingCount: 0 });
  }
}

export const offlineService = new OfflineService();
