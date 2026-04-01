import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

export interface BudgetAlert {
  id: string;
  type: 'threshold' | 'overspend' | 'daily_limit';
  category: string;
  message: string;
  percentage: number;
  timestamp: string;
  read: boolean;
}

class BudgetAlertService {
  private readonly STORAGE_KEY = 'budget_alerts';

  async checkBudgetsAndAlert(userId: string): Promise<BudgetAlert[]> {
    const alerts: BudgetAlert[] = [];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    
    // Get all budgets
    const { data: budgets } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId);

    // Get monthly spending by category
    const { data: transactions } = await supabase
      .from('transactions')
      .select('category, amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', startOfMonth);

    // Calculate spending per category
    const spendingByCategory = new Map<string, number>();
    (transactions || []).forEach(t => {
      const current = spendingByCategory.get(t.category) || 0;
      spendingByCategory.set(t.category, current + Number(t.amount));
    });

    // Check each budget
    (budgets || []).forEach(budget => {
      const spent = spendingByCategory.get(budget.category) || 0;
      const percentage = (spent / budget.amount) * 100;

      // 100% exceeded
      if (percentage >= 100) {
        const alert: BudgetAlert = {
          id: `overspend-${budget.category}-${Date.now()}`,
          type: 'overspend',
          category: budget.category,
          message: `You exceeded your ${budget.category} budget! Spent $${spent.toFixed(2)} of $${budget.amount.toFixed(2)}`,
          percentage,
          timestamp: new Date().toISOString(),
          read: false
        };
        alerts.push(alert);
        this.sendNotification(alert);
      }
      // 80% threshold warning
      else if (percentage >= 80) {
        const alert: BudgetAlert = {
          id: `threshold-${budget.category}-${Date.now()}`,
          type: 'threshold',
          category: budget.category,
          message: `You used ${percentage.toFixed(0)}% of your ${budget.category} budget`,
          percentage,
          timestamp: new Date().toISOString(),
          read: false
        };
        alerts.push(alert);
        this.sendNotification(alert);
      }
    });

    // Check daily budget
    const dailyAlert = await this.checkDailyBudget(userId);
    if (dailyAlert) {
      alerts.push(dailyAlert);
      this.sendNotification(dailyAlert);
    }

    // Save alerts
    await this.saveAlerts(userId, alerts);

    return alerts;
  }

  private async checkDailyBudget(userId: string): Promise<BudgetAlert | null> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_budget')
      .eq('id', userId)
      .single();

    if (!profile?.daily_budget) return null;

    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', startOfToday.toISOString());

    const spent = (transactions || []).reduce((sum, t) => sum + Number(t.amount), 0);
    const percentage = (spent / profile.daily_budget) * 100;

    if (percentage >= 90) {
      return {
        id: `daily-${Date.now()}`,
        type: 'daily_limit',
        category: 'Daily Budget',
        message: `You've used ${percentage.toFixed(0)}% of today's budget`,
        percentage,
        timestamp: new Date().toISOString(),
        read: false
      };
    }

    return null;
  }

  private async sendNotification(alert: BudgetAlert): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: alert.type === 'overspend' ? '⚠️ Budget Exceeded' : '📊 Budget Alert',
        body: alert.message,
        data: { alertId: alert.id, type: 'budget_alert' }
      },
      trigger: null // Immediate
    });
  }

  async getAlerts(userId: string): Promise<BudgetAlert[]> {
    const key = `${this.STORAGE_KEY}_${userId}`;
    const stored = await AsyncStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  }

  private async saveAlerts(userId: string, newAlerts: BudgetAlert[]): Promise<void> {
    const key = `${this.STORAGE_KEY}_${userId}`;
    const existing = await this.getAlerts(userId);
    
    // Merge and deduplicate by category for same day
    const today = new Date().toDateString();
    const filteredExisting = existing.filter(a => 
      new Date(a.timestamp).toDateString() !== today ||
      !newAlerts.some(na => na.category === a.category && na.type === a.type)
    );

    const merged = [...newAlerts, ...filteredExisting].slice(0, 50); // Keep last 50
    await AsyncStorage.setItem(key, JSON.stringify(merged));
  }

  async markAsRead(userId: string, alertId: string): Promise<void> {
    const key = `${this.STORAGE_KEY}_${userId}`;
    const alerts = await this.getAlerts(userId);
    const updated = alerts.map(a => 
      a.id === alertId ? { ...a, read: true } : a
    );
    await AsyncStorage.setItem(key, JSON.stringify(updated));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const alerts = await this.getAlerts(userId);
    return alerts.filter(a => !a.read).length;
  }

  async clearOldAlerts(userId: string, daysToKeep: number = 7): Promise<void> {
    const key = `${this.STORAGE_KEY}_${userId}`;
    const alerts = await this.getAlerts(userId);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);
    
    const filtered = alerts.filter(a => new Date(a.timestamp) > cutoff);
    await AsyncStorage.setItem(key, JSON.stringify(filtered));
  }
}

export const budgetAlertService = new BudgetAlertService();
