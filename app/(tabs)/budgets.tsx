import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const ScalePressable = ({ children, onPress, style }: { children: React.ReactNode, onPress?: () => void, style?: any }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const FadeInView = ({ children, delay = 0, style }: { children: React.ReactNode, delay?: number, style?: any }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[style, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {children}
    </Animated.View>
  );
};

type BudgetCategory = {
  id: string;
  name: string;
  spent: number;
  total: number;
  percent: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  left: number;
  dailyAvg: number;
};

const CATEGORY_STYLES: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  'Food': { color: '#FF6B6B', icon: 'fast-food-outline' },
  'Transport': { color: '#5C6BC0', icon: 'car-sport-outline' },
  'Utilities': { color: '#2E7D32', icon: 'flash-outline' },
  'Fun': { color: '#FFA726', icon: 'game-controller-outline' },
  'Shopping': { color: '#E91E63', icon: 'bag-handle-outline' },
  'Salary': { color: '#4CAF50', icon: 'cash-outline' },
  'Freelance': { color: '#AB47BC', icon: 'briefcase-outline' },
  'Invest': { color: '#26A69A', icon: 'trending-up-outline' },
  'Gift': { color: '#EC407A', icon: 'gift-outline' },
  'Savings': { color: '#78909C', icon: 'stats-chart-outline' },
};

const DEFAULT_STYLE = { color: '#9E9E9E', icon: 'cart-outline' as any };

export default function BudgetsScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedMonth] = useState('February');
  const [loading, setLoading] = useState(true);
  const [monthlyLimit, setMonthlyLimit] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);

  // Modal state
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'monthly' | 'daily'>('monthly');
  const [newLimit, setNewLimit] = useState('');
  const [sortType, setSortType] = useState<'spent' | 'remaining' | 'name'>('spent');

  useFocusEffect(
    useCallback(() => {
      fetchBudgetData();
    }, [])
  );

  const fetchBudgetData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch User Settings (Budget Limits)
      const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_budget, daily_budget')
        .eq('id', user.id)
        .single();

      const limit = profile?.monthly_budget || 3000;
      const dLimit = profile?.daily_budget || 100;
      setMonthlyLimit(limit);
      setDailyLimit(dLimit);

      // 2. Fetch Transactions for the current month
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'expense')
        .gte('date', startOfMonth);

      // 3. Group by category
      const group: Record<string, number> = {};
      let total = 0;
      transactions?.forEach(tx => {
        const cat = tx.category || 'Other';
        group[cat] = (group[cat] || 0) + Number(tx.amount);
        total += Number(tx.amount);
      });
      setTotalSpent(total);

      // 4. Map to BudgetCategory
      const mapped: BudgetCategory[] = Object.keys(group).map(catName => {
        const spent = group[catName];
        const style = CATEGORY_STYLES[catName] || DEFAULT_STYLE;
        // Total per category logic: For now, we don't have per-category limits in DB
        // Let's assume an arbitrary limit for demo or split monthly budget?
        // Let's use a dynamic one based on spending + buffer
        const catTotal = spent > 500 ? spent * 1.2 : 500;

        return {
          id: catName,
          name: catName,
          spent,
          total: catTotal,
          percent: Math.round((spent / catTotal) * 100),
          color: style.color,
          icon: style.icon,
          left: Math.max(catTotal - spent, 0),
          dailyAvg: spent / new Date().getDate(),
        };
      });

      const sorted = mapped.sort((a, b) => {
        if (sortType === 'spent') return b.spent - a.spent;
        if (sortType === 'remaining') return b.left - a.left;
        return a.name.localeCompare(b.name);
      });
      setCategories(sorted);
    } catch (e) {
      console.error('Budget fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = () => {
    const next = sortType === 'spent' ? 'remaining' : sortType === 'remaining' ? 'name' : 'spent';
    setSortType(next);
    setCategories([...categories].sort((a, b) => {
      if (next === 'spent') return b.spent - a.spent;
      if (next === 'remaining') return b.left - a.left;
      return a.name.localeCompare(b.name);
    }));
  };

  const handleUpdateLimit = async () => {
    const val = parseFloat(newLimit);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid budget amount');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User session not found');

      const updateData = modalType === 'monthly'
        ? { monthly_budget: val }
        : { daily_budget: val };

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...updateData,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setIsEditModalVisible(false);
      Alert.alert('Success', `${modalType === 'monthly' ? 'Monthly' : 'Daily'} budget updated`);

      // Re-fetch to sync everything
      await fetchBudgetData();
    } catch (e: any) {
      console.error('Update error:', e);
      Alert.alert('Error', e.message || 'Failed to update budget');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.bgDark]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <FadeInView delay={100} style={styles.header}>
          <Text style={[styles.title, isDark && styles.textWhite]}>My Budget</Text>
          <View style={[styles.monthLabel, isDark && styles.monthLabelDark]}>
            <Text style={[styles.monthText, isDark && styles.textWhite]}>{selectedMonth}</Text>
          </View>
        </FadeInView>

        {/* Main Budget Card */}
        <FadeInView delay={300}>
          <View style={[styles.mainCard, isDark && styles.mainCardDark]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardLabel}>MONTHLY LIMIT</Text>
              <ScalePressable
                onPress={() => {
                  setModalType('monthly');
                  setNewLimit(monthlyLimit.toString());
                  setIsEditModalVisible(true);
                }}
                style={[styles.editIconBtn, { backgroundColor: 'rgba(255, 213, 79, 0.2)' }]}
              >
                <Ionicons name="pencil" size={18} color="#FFD54F" />
              </ScalePressable>
            </View>

            <Text style={styles.totalAmount}>${monthlyLimit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>

            <View style={styles.cardDivider} />

            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.footerLabel}>Daily Goal</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={styles.footerValueWhite}>${dailyLimit.toFixed(2)}</Text>
                  <ScalePressable
                    onPress={() => {
                      setModalType('daily');
                      setNewLimit(dailyLimit.toString());
                      setIsEditModalVisible(true);
                    }}
                    style={styles.dailyEditBtn}
                  >
                    <Ionicons name="pencil" size={12} color="#FFF" />
                  </ScalePressable>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.footerLabel}>Left to Spend</Text>
                <Text style={styles.footerValueYellow}>${Math.max(monthlyLimit - totalSpent, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
              </View>
            </View>
          </View>
        </FadeInView>

        {/* Categories Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>Categories</Text>
          <TouchableOpacity onPress={toggleFilter} style={[styles.filterBtn, isDark && styles.filterBtnDark]}>
            <Ionicons name="filter-outline" size={16} color={isDark ? "#FFD54F" : "#1A1A1A"} />
            <Text style={[styles.filterText, isDark && styles.textTintDark]}>
              {sortType === 'spent' ? 'Spent' : sortType === 'remaining' ? 'Left' : 'A-Z'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Categories List */}
        <View style={styles.categoriesList}>
          {categories.length > 0 ? (
            categories.map((cat, idx) => (
              <FadeInView key={cat.id} delay={500 + (idx * 100)}>
                <ScalePressable style={[styles.categoryCard, isDark && styles.cardDark]}>
                  <View style={styles.catHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: cat.color + '20' }]}>
                      <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={[styles.catName, isDark && styles.textWhite]}>{cat.name}</Text>
                        <Text style={[styles.catPercent, isDark && styles.textWhite]}>{cat.percent}%</Text>
                      </View>
                      <Text style={styles.catSpentText}>${cat.spent.toFixed(0)} spent of ${cat.total.toFixed(0)}</Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={[styles.progressBg, isDark && styles.progressBgDark]}>
                    <View style={[styles.progressFill, { width: `${cat.percent}%`, backgroundColor: cat.color }]} />
                  </View>

                  {/* Footer Info */}
                  <View style={styles.catFooter}>
                    <View style={[styles.leftBadge, isDark && styles.badgeDark]}>
                      <Text style={[styles.leftText, isDark && styles.textWhite]}>${cat.left.toFixed(0)} left</Text>
                    </View>
                    <Text style={styles.dailyAvg}>Daily avg: ${cat.dailyAvg.toFixed(0)}</Text>
                  </View>
                </ScalePressable>
              </FadeInView>
            ))
          ) : (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Ionicons name="receipt-outline" size={48} color={isDark ? "#333" : "#E0E0E0"} />
              <Text style={{ color: '#9E9E9E', marginTop: 12 }}>No transactions for this month yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Limit Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.cardDark]}>
            <Text style={[styles.modalTitle, isDark && styles.textWhite]}>Set {modalType === 'monthly' ? 'Monthly' : 'Daily'} Budget</Text>
            <TextInput
              style={[styles.modalInput, isDark && styles.inputDark, isDark && styles.textWhite]}
              placeholder="Amount"
              placeholderTextColor="#9E9E9E"
              value={newLimit}
              onChangeText={setNewLimit}
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, isDark ? styles.modalButtonCancelDark : styles.modalButtonCancel]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={[styles.modalButtonTextCancel, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, isDark ? styles.saveButtonDark : styles.modalButtonAdd]}
                onPress={handleUpdateLimit}
              >
                <Text style={[styles.modalButtonTextAdd, { color: isDark ? '#1A1A1A' : '#FFFFFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  bgDark: {
    backgroundColor: '#0F0F12',
  },
  content: {
    padding: 24,
    paddingBottom: 100,
    gap: 24
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A'
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textBlack: {
    color: '#000000',
  },
  textTintDark: {
    color: '#FFD54F',
  },
  monthLabel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  monthLabelDark: {
    backgroundColor: '#1A1A1A',
    borderColor: '#333',
  },
  monthText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  // Main Card
  mainCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  mainCardDark: {
    backgroundColor: '#222',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    fontWeight: '700',
    letterSpacing: 1,
  },
  editIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyEditBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    marginBottom: 4,
  },
  footerValueWhite: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerValueYellow: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFD54F',
  },

  // Sections
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  filterBtnDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Category list
  categoriesList: {
    gap: 16,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F5F5F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#1A1A1A',
    borderColor: '#333',
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  catPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  catSpentText: {
    fontSize: 13,
    color: '#9E9E9E',
  },
  progressBg: {
    height: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    marginBottom: 16,
  },
  progressBgDark: {
    backgroundColor: '#333',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  catFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeDark: {
    backgroundColor: '#333',
  },
  leftText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  dailyAvg: {
    fontSize: 12,
    color: '#9E9E9E',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 30,
    width: '100%',
    gap: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 18,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputDark: {
    backgroundColor: '#333',
    color: '#FFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F5F5F5',
  },
  modalButtonCancelDark: {
    backgroundColor: '#333',
  },
  modalButtonAdd: {
    backgroundColor: '#1A1A1A',
  },
  saveButtonDark: {
    backgroundColor: '#FFFFFF',
  },
  modalButtonTextCancel: {
    fontWeight: '700',
    fontSize: 16,
  },
  modalButtonTextAdd: {
    fontWeight: '700',
    fontSize: 16,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabDark: {
    backgroundColor: '#FFD54F',
  }
});