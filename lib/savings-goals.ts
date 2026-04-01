import { supabase } from './supabase';

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export interface GoalProgress {
  percentage: number;
  remaining: number;
  daysLeft: number | null;
  monthlyContributionNeeded: number | null;
  isOnTrack: boolean;
}

class SavingsGoalService {
  async getGoals(userId: string): Promise<SavingsGoal[]> {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getAllGoals(userId: string): Promise<SavingsGoal[]> {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createGoal(userId: string, goal: Omit<SavingsGoal, 'id' | 'user_id' | 'created_at' | 'status'>): Promise<SavingsGoal> {
    const { data, error } = await supabase
      .from('savings_goals')
      .insert({
        ...goal,
        user_id: userId,
        status: 'active',
        current_amount: goal.current_amount || 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateGoal(goalId: string, updates: Partial<SavingsGoal>): Promise<SavingsGoal> {
    const { data, error } = await supabase
      .from('savings_goals')
      .update(updates)
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async addContribution(goalId: string, amount: number): Promise<SavingsGoal> {
    const { data: goal } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (!goal) throw new Error('Goal not found');

    const newAmount = goal.current_amount + amount;
    const status = newAmount >= goal.target_amount ? 'completed' : 'active';

    const { data, error } = await supabase
      .from('savings_goals')
      .update({ 
        current_amount: newAmount,
        status 
      })
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteGoal(goalId: string): Promise<void> {
    const { error } = await supabase
      .from('savings_goals')
      .delete()
      .eq('id', goalId);

    if (error) throw error;
  }

  calculateProgress(goal: SavingsGoal): GoalProgress {
    const percentage = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
    const remaining = Math.max(0, goal.target_amount - goal.current_amount);
    
    let daysLeft: number | null = null;
    let monthlyContributionNeeded: number | null = null;
    let isOnTrack = true;

    if (goal.deadline) {
      const deadline = new Date(goal.deadline);
      const today = new Date();
      daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft > 0 && remaining > 0) {
        const monthsLeft = daysLeft / 30;
        monthlyContributionNeeded = remaining / monthsLeft;
        
        // Check if goal is achievable (needs less than 50% of monthly budget)
        isOnTrack = monthlyContributionNeeded < (goal.target_amount * 0.5);
      }
    }

    return {
      percentage,
      remaining,
      daysLeft,
      monthlyContributionNeeded,
      isOnTrack
    };
  }

  async getGoalStats(userId: string): Promise<{
    totalGoals: number;
    completedGoals: number;
    totalSaved: number;
    totalTarget: number;
    overallProgress: number;
  }> {
    const { data } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId);

    const goals = data || [];
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);
    const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
    const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

    return {
      totalGoals,
      completedGoals,
      totalSaved,
      totalTarget,
      overallProgress
    };
  }
}

export const savingsGoalService = new SavingsGoalService();
