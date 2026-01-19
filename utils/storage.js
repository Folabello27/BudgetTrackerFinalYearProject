import AsyncStorage from '@react-native-async-storage/async-storage';

const TRANSACTIONS_KEY = '@budget_tracker_transactions';
const BALANCE_KEY = '@budget_tracker_balance';

// Get all transactions
export const getTransactions = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Error reading transactions:', e);
    return [];
  }
};

// Add a new transaction
export const addTransaction = async (transaction) => {
  try {
    const transactions = await getTransactions();
    const updatedTransactions = [...transactions, transaction];
    await AsyncStorage.setItem(
      TRANSACTIONS_KEY,
      JSON.stringify(updatedTransactions)
    );
  } catch (e) {
    console.error('Error adding transaction:', e);
    throw e;
  }
};

// Delete a transaction
export const deleteTransaction = async (transactionId) => {
  try {
    const transactions = await getTransactions();
    const updatedTransactions = transactions.filter(
      (t) => t.id !== transactionId
    );
    await AsyncStorage.setItem(
      TRANSACTIONS_KEY,
      JSON.stringify(updatedTransactions)
    );
  } catch (e) {
    console.error('Error deleting transaction:', e);
    throw e;
  }
};

// Get current balance
export const getBalance = async () => {
  try {
    const balance = await AsyncStorage.getItem(BALANCE_KEY);
    return balance != null ? parseFloat(balance) : 0;
  } catch (e) {
    console.error('Error reading balance:', e);
    return 0;
  }
};

// Update balance
export const updateBalance = async (amount) => {
  try {
    const currentBalance = await getBalance();
    const newBalance = currentBalance + amount;
    await AsyncStorage.setItem(BALANCE_KEY, newBalance.toString());
  } catch (e) {
    console.error('Error updating balance:', e);
    throw e;
  }
};

// Reset all data (useful for testing)
export const resetData = async () => {
  try {
    await AsyncStorage.removeItem(TRANSACTIONS_KEY);
    await AsyncStorage.removeItem(BALANCE_KEY);
  } catch (e) {
    console.error('Error resetting data:', e);
    throw e;
  }
};

