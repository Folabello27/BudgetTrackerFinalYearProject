import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTransactions, getBalance } from '../utils/storage';

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
    const transactions = await getTransactions();
    const balanceData = await getBalance();
    
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
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Budget Tracker</Text>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceAmount}>${balance.toFixed(2)}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Income</Text>
          <Text style={[styles.statAmount, { color: '#4CAF50' }]}>
            +${income.toFixed(2)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Expenses</Text>
          <Text style={[styles.statAmount, { color: '#F44336' }]}>
            -${expenses.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {recentTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Add your first transaction!</Text>
          </View>
        ) : (
          recentTransactions.map((transaction, index) => (
            <View key={index} style={styles.transactionItem}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDescription}>
                  {transaction.description}
                </Text>
                <Text style={styles.transactionDate}>
                  {new Date(transaction.date).toLocaleDateString()}
                </Text>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  transaction.type === 'income'
                    ? styles.incomeAmount
                    : styles.expenseAmount,
                ]}
              >
                {transaction.type === 'income' ? '+' : '-'}$
                {parseFloat(transaction.amount).toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#4A90E2',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginTop: 10,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  recentSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
  },
  transactionItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: '#4CAF50',
  },
  expenseAmount: {
    color: '#F44336',
  },
});

