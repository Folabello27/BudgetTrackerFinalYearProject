import { budgetAlertService, BudgetAlert } from '../lib/budget-alerts';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Mocks
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({ eq: jest.fn(() => ({ gte: jest.fn(() => ({ data: [] })) })) })),
    })),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
}));

describe('BudgetAlertService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkBudgetsAndAlert', () => {
    it('should return empty array when no budgets exist', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({ data: [] })),
        })),
      });

      const alerts = await budgetAlertService.checkBudgetsAndAlert('user-123');
      expect(alerts).toEqual([]);
    });

    it('should create overspend alert when spending exceeds budget', async () => {
      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              data: [{ id: '1', category: 'Food', amount: 100 }],
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                data: [
                  { category: 'Food', amount: 150 },
                ],
              })),
            })),
          })),
        });

      const alerts = await budgetAlertService.checkBudgetsAndAlert('user-123');
      
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('overspend');
      expect(alerts[0].category).toBe('Food');
    });

    it('should create threshold alert at 80% spending', async () => {
      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              data: [{ id: '1', category: 'Transport', amount: 100 }],
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                data: [
                  { category: 'Transport', amount: 85 },
                ],
              })),
            })),
          })),
        });

      const alerts = await budgetAlertService.checkBudgetsAndAlert('user-123');
      
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('threshold');
      expect(alerts[0].percentage).toBeGreaterThanOrEqual(80);
    });
  });

  describe('getAlerts', () => {
    it('should return parsed alerts from storage', async () => {
      const mockAlerts: BudgetAlert[] = [
        { id: '1', type: 'threshold', category: 'Food', message: 'Test', percentage: 80, timestamp: new Date().toISOString(), read: false },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockAlerts));

      const alerts = await budgetAlertService.getAlerts('user-123');
      expect(alerts).toEqual(mockAlerts);
    });

    it('should return empty array when storage is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const alerts = await budgetAlertService.getAlerts('user-123');
      expect(alerts).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('should mark alert as read', async () => {
      const mockAlerts: BudgetAlert[] = [
        { id: '1', type: 'threshold', category: 'Food', message: 'Test', percentage: 80, timestamp: new Date().toISOString(), read: false },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockAlerts));

      await budgetAlertService.markAsRead('user-123', '1');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'budget_alerts_user-123',
        expect.stringContaining('"read":true')
      );
    });
  });
});
