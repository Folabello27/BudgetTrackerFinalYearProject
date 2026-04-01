import { supabase } from './supabase';

export interface Insight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'suggestion';
  title: string;
  message: string;
  metric?: string;
  action?: string;
}

export interface SpendingComparison {
  category: string;
  currentMonth: number;
  lastMonth: number;
  change: number;
  changePercent: number;
}

export interface FinancialHealth {
  score: number;
  factors: {
    savingsRate: number;
    budgetAdherence: number;
    expenseGrowth: number;
    incomeStability: number;
  };
}

class InsightsService {
  async generateInsights(userId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Get spending comparison
    const comparisons = await this.getSpendingComparison(userId);
    
    // Check for significant spending increases
    comparisons.forEach(comp => {
      if (comp.changePercent > 35) {
        insights.push({
          id: `spending-up-${comp.category}`,
          type: 'warning',
          title: 'Spending Alert',
          message: `You spent ${comp.changePercent.toFixed(0)}% more on ${comp.category.toLowerCase()} than last month`,
          metric: `$${comp.currentMonth.toFixed(0)} vs $${comp.lastMonth.toFixed(0)}`,
          action: 'Review transactions'
        });
      } else if (comp.changePercent < -20) {
        insights.push({
          id: `spending-down-${comp.category}`,
          type: 'success',
          title: 'Great Job!',
          message: `You spent ${Math.abs(comp.changePercent).toFixed(0)}% less on ${comp.category.toLowerCase()} than last month`,
          metric: `Saved $${Math.abs(comp.change).toFixed(0)}`,
          action: 'Keep it up'
        });
      }
    });

    // Check budget adherence
    const budgetStatus = await this.checkBudgetStatus(userId);
    if (budgetStatus.overspentCategories.length > 0) {
      insights.push({
        id: 'budget-overspend',
        type: 'warning',
        title: 'Budget Exceeded',
        message: `You've exceeded your budget in ${budgetStatus.overspentCategories.length} categor${budgetStatus.overspentCategories.length === 1 ? 'y' : 'ies'}`,
        metric: budgetStatus.overspentCategories.join(', '),
        action: 'Adjust spending'
      });
    }

    // Check for subscriptions
    const subscriptionAnalysis = await this.analyzeSubscriptions(userId);
    if (subscriptionAnalysis.total > 50) {
      insights.push({
        id: 'subscription-cost',
        type: 'suggestion',
        title: 'Subscription Review',
        message: `You spend $${subscriptionAnalysis.total.toFixed(0)}/month on subscriptions`,
        metric: `${subscriptionAnalysis.count} active subscriptions`,
        action: subscriptionAnalysis.total > 100 ? 'Consider reviewing unused subscriptions' : 'Manage subscriptions'
      });
    }

    // Savings opportunity
    const savingsOpportunity = await this.calculateSavingsOpportunity(userId);
    if (savingsOpportunity.potential > 50) {
      insights.push({
        id: 'savings-opportunity',
        type: 'suggestion',
        title: 'Savings Opportunity',
        message: 'Based on your spending patterns, you could save more',
        metric: `Potential: $${savingsOpportunity.potential.toFixed(0)}/month`,
        action: 'Set a savings goal'
      });
    }

    // Income vs Expense ratio
    const ratio = await this.getIncomeExpenseRatio(userId);
    if (ratio < 0.2) {
      insights.push({
        id: 'low-savings',
        type: 'warning',
        title: 'Low Savings Rate',
        message: 'Your savings rate is below 20% of your income',
        metric: `${(ratio * 100).toFixed(0)}% saved`,
        action: 'Reduce expenses'
      });
    } else if (ratio > 0.3) {
      insights.push({
        id: 'good-savings',
        type: 'success',
        title: 'Excellent Savings!',
        message: 'You\'re saving more than 30% of your income',
        metric: `${(ratio * 100).toFixed(0)}% saved`,
        action: 'Consider investing'
      });
    }

    return insights;
  }

  async getSpendingComparison(userId: string): Promise<SpendingComparison[]> {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const startOfCurrent = new Date(currentYear, currentMonth, 1).toISOString();
    const endOfCurrent = now.toISOString();
    const startOfLast = new Date(lastMonthYear, lastMonth, 1).toISOString();
    const endOfLast = new Date(currentYear, currentMonth, 1).toISOString();

    // Current month spending by category
    const { data: currentData } = await supabase
      .from('transactions')
      .select('category, amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', startOfCurrent)
      .lte('date', endOfCurrent);

    // Last month spending by category
    const { data: lastData } = await supabase
      .from('transactions')
      .select('category, amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', startOfLast)
      .lt('date', endOfLast);

    const categories = new Set([
      ...(currentData || []).map(t => t.category),
      ...(lastData || []).map(t => t.category)
    ]);

    return Array.from(categories).map(category => {
      const current = (currentData || [])
        .filter(t => t.category === category)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const last = (lastData || [])
        .filter(t => t.category === category)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const change = current - last;
      const changePercent = last > 0 ? ((change / last) * 100) : (current > 0 ? 100 : 0);

      return {
        category,
        currentMonth: current,
        lastMonth: last,
        change,
        changePercent
      };
    });
  }

  async checkBudgetStatus(userId: string): Promise<{ overspentCategories: string[]; nearLimitCategories: string[] }> {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    
    const { data: budgets } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('category, amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', startOfMonth);

    const overspent: string[] = [];
    const nearLimit: string[] = [];

    (budgets || []).forEach(budget => {
      const spent = (transactions || [])
        .filter(t => t.category === budget.category)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      if (spent > budget.amount) {
        overspent.push(budget.category);
      } else if (spent > budget.amount * 0.8) {
        nearLimit.push(budget.category);
      }
    });

    return { overspentCategories: overspent, nearLimitCategories: nearLimit };
  }

  async analyzeSubscriptions(userId: string): Promise<{ total: number; count: number }> {
    const { data } = await supabase
      .from('subscriptions')
      .select('amount')
      .eq('user_id', userId)
      .eq('status', 'active');

    const total = (data || []).reduce((sum, s) => sum + Number(s.amount), 0);
    return { total, count: data?.length || 0 };
  }

  async calculateSavingsOpportunity(userId: string): Promise<{ potential: number; recommendations: string[] }> {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('category, amount, note')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    let potential = 0;
    const recommendations: string[] = [];

    // Check for dining out patterns
    const diningSpend = (transactions || [])
      .filter(t => t.category === 'Food' || t.note?.toLowerCase().includes('restaurant') || t.note?.toLowerCase().includes('starbucks'))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    if (diningSpend > 200) {
      potential += diningSpend * 0.2;
      recommendations.push('Reduce dining out by 20%');
    }

    // Check entertainment spending
    const entertainmentSpend = (transactions || [])
      .filter(t => t.category === 'Fun' || t.category === 'Entertainment')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    if (entertainmentSpend > 150) {
      potential += entertainmentSpend * 0.15;
      recommendations.push('Reduce entertainment spending by 15%');
    }

    return { potential, recommendations };
  }

  async getIncomeExpenseRatio(userId: string): Promise<number> {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    
    const { data } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId)
      .gte('date', startOfMonth);

    const income = (data || [])
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = (data || [])
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return income > 0 ? (income - expenses) / income : 0;
  }

  async calculateFinancialHealth(userId: string): Promise<FinancialHealth> {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const startOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString();

    // Get all transactions
    const { data: currentMonthData } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId)
      .gte('date', startOfMonth);

    const { data: lastMonthData } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId)
      .gte('date', startOfLastMonth)
      .lt('date', startOfMonth);

    const currentIncome = (currentMonthData || [])
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const currentExpenses = (currentMonthData || [])
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const lastExpenses = (lastMonthData || [])
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Calculate factors
    const savingsRate = currentIncome > 0 ? ((currentIncome - currentExpenses) / currentIncome) * 100 : 0;
    
    // Budget adherence - compare to profile budgets
    const { data: profile } = await supabase
      .from('profiles')
      .select('monthly_budget')
      .eq('id', userId)
      .single();

    const budgetAdherence = profile?.monthly_budget 
      ? Math.max(0, 100 - ((currentExpenses / profile.monthly_budget) * 100))
      : 50;

    const expenseGrowth = lastExpenses > 0 
      ? ((currentExpenses - lastExpenses) / lastExpenses) * 100 
      : 0;

    const incomeStability = currentIncome > 0 ? 100 : 0;

    // Calculate overall score (0-100)
    const score = Math.min(100, Math.max(0, 
      (savingsRate * 0.3) + 
      (budgetAdherence * 0.3) + 
      (Math.max(0, 100 - expenseGrowth) * 0.2) + 
      (incomeStability * 0.2)
    ));

    return {
      score: Math.round(score),
      factors: {
        savingsRate,
        budgetAdherence,
        expenseGrowth,
        incomeStability
      }
    };
  }
}

export const insightsService = new InsightsService();
