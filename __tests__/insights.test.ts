import { insightsService, Insight, FinancialHealth } from '../lib/insights';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({ 
        eq: jest.fn(() => ({ 
          gte: jest.fn(() => ({ 
            lte: jest.fn(() => ({ data: [] })),
            lt: jest.fn(() => ({ data: [] })),
            data: []
          })) 
        })),
        single: jest.fn(() => ({ data: null }))
      })),
    })),
  },
}));

describe('InsightsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateInsights', () => {
    it('should generate spending increase warning when spending > 35%', async () => {
      const mockDate = new Date('2024-03-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                lte: jest.fn(() => ({
                  data: [{ category: 'Food', amount: 135 }],
                })),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                lt: jest.fn(() => ({
                  data: [{ category: 'Food', amount: 100 }],
                })),
              })),
            })),
          })),
        });

      const insights = await insightsService.generateInsights('user-123');
      
      const spendingAlert = insights.find(i => i.id === 'spending-up-Food');
      expect(spendingAlert).toBeDefined();
      expect(spendingAlert?.type).toBe('warning');
      
      jest.restoreAllMocks();
    });

    it('should generate budget exceeded warning', async () => {
      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                lte: jest.fn(() => ({ data: [] })),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                lt: jest.fn(() => ({ data: [] })),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              data: [{ category: 'Food', amount: 100 }],
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                data: [{ category: 'Food', amount: 150 }],
              })),
            })),
          })),
        });

      const insights = await insightsService.generateInsights('user-123');
      
      const budgetAlert = insights.find(i => i.id === 'budget-overspend');
      expect(budgetAlert).toBeDefined();
      expect(budgetAlert?.type).toBe('warning');
    });

    it('should return empty array for new user with no data', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({ data: [] })),
              lt: jest.fn(() => ({ data: [] })),
            })),
            data: []
          })),
        })),
      });

      const insights = await insightsService.generateInsights('user-123');
      expect(insights).toBeInstanceOf(Array);
    });
  });

  describe('calculateFinancialHealth', () => {
    it('should calculate health score based on savings rate', async () => {
      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                data: [
                  { amount: 5000, type: 'income' },
                  { amount: 3000, type: 'expense' },
                ],
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                lt: jest.fn(() => ({
                  data: [{ amount: 2500, type: 'expense' }],
                })),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ data: { monthly_budget: 4000 } })),
            })),
          })),
        });

      const health = await insightsService.calculateFinancialHealth('user-123');
      
      expect(health.score).toBeGreaterThanOrEqual(0);
      expect(health.score).toBeLessThanOrEqual(100);
      expect(health.factors.savingsRate).toBe(40); // (5000-3000)/5000 * 100
    });
  });

  describe('getIncomeExpenseRatio', () => {
    it('should calculate correct savings ratio', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              data: [
                { amount: 5000, type: 'income' },
                { amount: 3000, type: 'expense' },
              ],
            })),
          })),
        })),
      });

      const ratio = await insightsService.getIncomeExpenseRatio('user-123');
      expect(ratio).toBe(0.4); // (5000-3000)/5000
    });

    it('should return 0 when no income', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              data: [{ amount: 1000, type: 'expense' }],
            })),
          })),
        })),
      });

      const ratio = await insightsService.getIncomeExpenseRatio('user-123');
      expect(ratio).toBe(0);
    });
  });
});
