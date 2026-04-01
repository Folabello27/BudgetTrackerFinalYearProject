import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

export interface ExportOptions {
  startDate?: Date;
  endDate?: Date;
  format: 'csv' | 'json';
  includeIncome: boolean;
  includeExpenses: boolean;
}

class ExportService {
  async exportTransactions(userId: string, options: ExportOptions): Promise<string> {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;

    // Filter by date if specified
    let filtered = transactions || [];
    if (options.startDate) {
      filtered = filtered.filter(t => new Date(t.date) >= options.startDate!);
    }
    if (options.endDate) {
      filtered = filtered.filter(t => new Date(t.date) <= options.endDate!);
    }
    if (!options.includeIncome) {
      filtered = filtered.filter(t => t.type !== 'income');
    }
    if (!options.includeExpenses) {
      filtered = filtered.filter(t => t.type !== 'expense');
    }

    if (options.format === 'csv') {
      return this.generateCSV(filtered);
    } else {
      return this.generateJSON(filtered);
    }
  }

  private generateCSV(transactions: any[]): string {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Note', 'Created At'];
    const rows = transactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.type,
      t.category,
      t.amount,
      `"${(t.note || '').replace(/"/g, '""')}"`, // Escape quotes
      new Date(t.created_at).toLocaleDateString()
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  private generateJSON(transactions: any[]): string {
    return JSON.stringify(transactions, null, 2);
  }

  async downloadReport(userId: string, options: ExportOptions): Promise<void> {
    const content = await this.exportTransactions(userId, options);
    
    const fileName = `budget_report_${new Date().toISOString().split('T')[0]}.${options.format}`;
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: options.format === 'csv' ? 'text/csv' : 'application/json',
        dialogTitle: 'Export Budget Report'
      });
    }
  }

  async generateMonthlyReport(userId: string, year: number, month: number): Promise<{
    csv: string;
    summary: {
      totalIncome: number;
      totalExpenses: number;
      netSavings: number;
      topCategories: { category: string; amount: number }[];
    }
  }> {
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 0).toISOString();

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    const csv = this.generateCSV(transactions || []);

    // Calculate summary
    const totalIncome = (transactions || [])
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = (transactions || [])
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Top categories
    const categoryMap = new Map<string, number>();
    (transactions || [])
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const current = categoryMap.get(t.category) || 0;
        categoryMap.set(t.category, current + Number(t.amount));
      });

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      csv,
      summary: {
        totalIncome,
        totalExpenses,
        netSavings: totalIncome - totalExpenses,
        topCategories
      }
    };
  }
}

export const exportService = new ExportService();
