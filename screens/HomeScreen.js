import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  StatusBar, 
  TouchableOpacity,
  Platform 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTransactions, getBalance } from '../utils/storage';

const COLORS = {
  primary: '#2A2D3E',
  accent: '#5E60CE',
  background: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1B1B1B',
  subText: '#8E9399',
  income: '#10B981',
  expense: '#EF4444',
  border: '#E5E7EB',
};

export default function HomeScreen() {
  const [balance, setBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const transactions = await getTransactions() || [];
      const balanceData = await getBalance() || 0;
      
      let totalIncome = 0;
      let totalExpenses = 0;
      
      transactions.forEach(transaction => {
        if (transaction.type === 'income') {
          totalIncome += parseFloat(transaction.amount);
        } else {
          totalExpenses += parseFloat(transaction.amount);
        }
      });
      
      setBalance(balanceData);
      setIncome(totalIncome);
      setExpenses(totalExpenses);
      setRecentTransactions(transactions.slice(-5).reverse());
    } catch (e) {
      console.error(e);
    }
  };

  const formatCurrency = (amount) => {
    return Number(amount).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    });
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <View style={styles.headerContainer}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greetingText}>Total Balance</Text>
              <Text style={styles.balanceText}>{formatCurrency(balance)}</Text>
            </View>
            <View style={styles.profilePlaceholder} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.iconText, { color: COLORS.income }]}>↓</Text>
            </View>
            <View>
              <Text style={styles.statLabel}>Income</Text>
              <Text style={[styles.statAmount, { color: COLORS.income }]}>
                {formatCurrency(income)}
              </Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.iconText, { color: COLORS.expense }]}>↑</Text>
            </View>
            <View>
              <Text style={styles.statLabel}>Expenses</Text>
              <Text style={[styles.statAmount, { color: COLORS.expense }]}>
                {formatCurrency(expenses)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Start tracking your spending!</Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {recentTransactions.map((transaction, index) => (
              <TouchableOpacity key={index} style={styles.transactionCard} activeOpacity={0.7}>
                <View style={[
                  styles.transactionIcon, 
                  { backgroundColor: transaction.type === 'income' ? '#E6FFFA' : '#FFF5F5' }
                ]}>
                  <Text style={{ fontSize: 18 }}>
                    {transaction.type === 'income' ? '💰' : '🛒'}
                  </Text>
                </View>

                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle} numberOfLines={1}>
                    {transaction.description}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {new Date(transaction.date).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
                    })}
                  </Text>
                </View>

                <Text style={[
                  styles.transactionAmount,
                  { color: transaction.type === 'income' ? COLORS.income : COLORS.text }
                ]}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  greetingText: {
    fontSize: 14,
    color: '#A0AEC0',
    fontWeight: '500',
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -25,
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.subText,
    marginBottom: 4,
    fontWeight: '600',
  },
  statAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  transactionsList: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.subText,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.subText,
    marginTop: 5,
  },
});
