import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
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

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type Period = 'Weekly' | 'Monthly' | 'Yearly';

type CategoryData = {
  id: string;
  name: string;
  amount: string;
  amountVal: number;
  color: string;
  percent: number;
  icon: keyof typeof Ionicons.glyphMap;
};

type InsightData = {
  label: string;
  total: string;
  healthy: boolean;
  avgDaily: string;
  highest: string;
  categories: CategoryData[];
};

const CATEGORY_STYLES: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  'Food': { color: '#FFD54F', icon: 'fast-food-outline' },
  'Transport': { color: '#81C784', icon: 'car-sport-outline' },
  'Utilities': { color: '#64B5F6', icon: 'flash-outline' },
  'Fun': { color: '#BA68C8', icon: 'game-controller-outline' },
  'Salary': { color: '#4DB6AC', icon: 'cash-outline' },
  'Freelance': { color: '#FF8A65', icon: 'briefcase-outline' },
  'Invest': { color: '#7986CB', icon: 'trending-up-outline' },
  'Gift': { color: '#F06292', icon: 'gift-outline' },
  'Savings': { color: '#A1887F', icon: 'stats-chart-outline' },
  'Shopping': { color: '#FFD54F', icon: 'bag-handle-outline' },
};

export default function InsightsScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [period, setPeriod] = useState<Period>('Monthly');
  const [selectedLabel, setSelectedLabel] = useState(MONTHS[new Date().getMonth()]);
  const [mode, setMode] = useState<'expense' | 'income'>('expense');
  const [modalVisible, setModalVisible] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [rotation] = useState(new Animated.Value(0));
  const [opacity] = useState(new Animated.Value(1));
  const [refreshing, setRefreshing] = useState(false);

  const [currentData, setCurrentData] = useState<InsightData>({
    label: '',
    total: '$0.00',
    healthy: true,
    avgDaily: '$0.00',
    highest: '$0.00',
    categories: []
  });

  useFocusEffect(
    useCallback(() => {
      fetchRealInsights();
    }, [period, selectedLabel, mode])
  );

  useEffect(() => {
    if (period === 'Weekly') setSelectedLabel('Current Week');
    else if (period === 'Monthly') setSelectedLabel(MONTHS[new Date().getMonth()]);
    else setSelectedLabel(new Date().getFullYear().toString());
  }, [period]);

  const fetchRealInsights = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase.from('transactions').select('*').eq('type', mode);

      if (period === 'Weekly') {
        const now = new Date();
        const start = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();
        query = query.gte('date', start);
      } else if (period === 'Monthly') {
        const monthIdx = MONTHS.indexOf(selectedLabel);
        const start = new Date(new Date().getFullYear(), monthIdx, 1).toISOString();
        const end = new Date(new Date().getFullYear(), monthIdx + 1, 0).toISOString();
        query = query.gte('date', start).lte('date', end);
      } else {
        const start = new Date(parseInt(selectedLabel), 0, 1).toISOString();
        const end = new Date(parseInt(selectedLabel), 11, 31).toISOString();
        query = query.gte('date', start).lte('date', end);
      }

      const { data: transactions } = await query;

      const group: Record<string, number> = {};
      let totalVal = 0;
      let highestVal = 0;

      transactions?.forEach(tx => {
        const cat = tx.category || 'Other';
        const amt = Number(tx.amount);
        group[cat] = (group[cat] || 0) + amt;
        totalVal += amt;
        if (amt > highestVal) highestVal = amt;
      });

      const categories: CategoryData[] = Object.keys(group).map(catName => {
        const val = group[catName];
        const style = CATEGORY_STYLES[catName] || { color: '#9E9E9E', icon: 'cart-outline' };
        return {
          id: catName,
          name: catName,
          amount: `$${val.toFixed(2)}`,
          amountVal: val,
          color: style.color,
          percent: totalVal > 0 ? val / totalVal : 0,
          icon: style.icon
        };
      });

      const days = period === 'Weekly' ? 7 : period === 'Monthly' ? 30 : 365;

      // 4. Fetch Budget Limit for Healthy Label
      const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_budget')
        .eq('id', user.id)
        .single();
      const budgetLimit = profile?.monthly_budget || 2000;
      const isHealthy = totalVal < (budgetLimit * (days / 30));

      // Trigger Animation
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 200, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(rotation, { toValue: 1, friction: 8, useNativeDriver: true })
        ])
      ]).start(() => {
        rotation.setValue(0);
      });

      setCurrentData({
        label: selectedLabel,
        total: `$${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        healthy: isHealthy,
        avgDaily: `$${(totalVal / days).toFixed(2)}`,
        highest: `$${highestVal.toFixed(2)}`,
        categories
      });
    } catch (e) {
      console.log('Error fetching insights:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRealInsights();
  }, [period, selectedLabel, mode]); // Added dependencies for fetchRealInsights

  const toggleSort = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const sortedCategories = useMemo(() => {
    return [...currentData.categories].sort((a, b) => {
      if (sortOrder === 'desc') return b.amountVal - a.amountVal;
      return a.amountVal - b.amountVal;
    });
  }, [currentData, sortOrder]);

  const handleSelect = (item: string) => {
    setSelectedLabel(item);
    setModalVisible(false);
  };

  const selectionList = useMemo(() => {
    if (period === 'Monthly') return MONTHS;
    if (period === 'Yearly') return ['2024', '2025', '2026'];
    return ['Current Week'];
  }, [period]);

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.bgDark]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? "#FFD54F" : "#1A1A1A"}
            colors={["#FFD54F"]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, isDark && styles.textWhite]}>Report</Text>
            <View style={[styles.toggleContainer, isDark && styles.toggleDark]}>
              <TouchableOpacity
                onPress={() => setMode('expense')}
                style={[styles.toggleBtn, mode === 'expense' && styles.toggleBtnActiveExp]}
              >
                <Text style={[styles.toggleText, mode === 'expense' && styles.toggleTextActiveExp]}>Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMode('income')}
                style={[styles.toggleBtn, mode === 'income' && styles.toggleBtnActiveInc]}
              >
                <Text style={[styles.toggleText, mode === 'income' && styles.toggleTextActiveInc]}>Income</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.monthSelector, isDark && styles.cardDark]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.monthText, isDark && styles.textWhite]}>{selectedLabel}</Text>
            <Ionicons name="chevron-down" size={16} color={isDark ? "#FFF" : "#1A1A1A"} />
          </TouchableOpacity>
        </View>

        {/* Period Switcher */}
        <View style={[styles.segmentControl, isDark && styles.segmentControlDark]}>
          {(['Weekly', 'Monthly', 'Yearly'] as Period[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[
                styles.segmentButton,
                period === p && (isDark ? styles.segmentButtonActiveDark : styles.segmentButtonActive)
              ]}
            >
              <Text style={[
                styles.segmentText,
                period === p && (isDark ? styles.segmentTextActiveDark : styles.segmentTextActive)
              ]}>
                {p}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Distribution Card */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <View style={styles.distributionHeader}>
            <View>
              <Text style={styles.totalLabel}>Total {mode === 'expense' ? 'Spent' : 'Earned'}</Text>
              <Text style={[styles.totalAmount, isDark && styles.textWhite]}>{currentData.total}</Text>
            </View>
            <View style={[
              currentData.healthy ? styles.healthyBadge : styles.unhealthyBadge,
              isDark && (currentData.healthy ? styles.healthyBadgeDark : styles.unhealthyBadgeDark)
            ]}>
              <Ionicons
                name={currentData.healthy ? "checkmark-circle" : "warning"}
                size={14}
                color={currentData.healthy ? (isDark ? "#000" : "#FFF") : "#FFF"}
                style={{ marginRight: 6 }}
              />
              <Text style={[
                styles.badgeText,
                currentData.healthy ? (isDark ? styles.textBlack : styles.textWhite) : styles.textWhite
              ]}>
                {mode === 'income' ? 'On Track' : (currentData.healthy ? 'Healthy' : 'Over Upper Limit')}
              </Text>
            </View>
          </View>

          {/* Stacked Distribution Bar */}
          <View style={styles.chartWrapper}>
            <View style={[styles.distributionBarBg, isDark && styles.distributionBarBgDark]}>
              {currentData.categories.map((cat, idx) => (
                <View
                  key={cat.id}
                  style={[
                    styles.distributionBarFill,
                    {
                      width: `${cat.percent * 100}%`,
                      backgroundColor: cat.color,
                      borderTopLeftRadius: idx === 0 ? 8 : 0,
                      borderBottomLeftRadius: idx === 0 ? 8 : 0,
                      borderTopRightRadius: idx === currentData.categories.length - 1 ? 8 : 0,
                      borderBottomRightRadius: idx === currentData.categories.length - 1 ? 8 : 0,
                    }
                  ]}
                />
              ))}
              {currentData.categories.length === 0 && (
                <View style={[styles.distributionBarFill, { width: '100%', backgroundColor: '#E0E0E0' }]} />
              )}
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legendWrapper}>
            {currentData.categories.slice(0, 4).map(cat => (
              <View key={cat.id} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: cat.color }]} />
                <Text style={[styles.legendText, isDark && styles.textWhite]} numberOfLines={1}>
                  {cat.name} ({Math.round(cat.percent * 100)}%)
                </Text>
              </View>
            ))}
            {currentData.categories.length > 4 && (
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: '#9E9E9E' }]} />
                <Text style={[styles.legendText, isDark && styles.textWhite]}>
                  Other ({Math.round(currentData.categories.slice(4).reduce((a, b) => a + b.percent, 0) * 100)}%)
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Metrics Row */}
        <Animated.View style={[styles.metricsRow, { opacity }]}>
          <FadeInView delay={600} style={{ flex: 1 }}>
            <View style={[styles.metricCard, isDark && styles.cardDark]}>
              <View style={[styles.metricIcon, { backgroundColor: isDark ? '#1A442E' : '#E8F5E9' }]}>
                <Ionicons name="calendar-outline" size={16} color={isDark ? "#81C784" : "#2E7D32"} />
              </View>
              <Text style={styles.metricLabel}>Daily Avg.</Text>
              <Text style={[styles.metricValue, isDark && styles.textWhite]}>{currentData.avgDaily}</Text>
            </View>
          </FadeInView>
          <FadeInView delay={700} style={{ flex: 1 }}>
            <View style={[styles.metricCard, isDark && styles.cardDark]}>
              <View style={[styles.metricIcon, { backgroundColor: isDark ? '#441A1A' : '#FFEBEE' }]}>
                <Ionicons name="trending-up-outline" size={16} color={isDark ? "#E57373" : "#C62828"} />
              </View>
              <Text style={styles.metricLabel}>Highest Spend</Text>
              <Text style={[styles.metricValue, isDark && styles.textWhite]}>{currentData.highest}</Text>
            </View>
          </FadeInView>
        </Animated.View>

        {/* Top Categories */}
        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>Top Categories</Text>
            <ScalePressable onPress={toggleSort} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#9E9E9E', fontSize: 13, fontWeight: '600' }}>
                {sortOrder === 'desc' ? 'Highest' : 'Lowest'}
              </Text>
              <Ionicons name={sortOrder === 'desc' ? "arrow-down" : "arrow-up"} size={14} color="#9E9E9E" />
            </ScalePressable>
          </View>

          <View style={styles.categoryList}>
            {sortedCategories.map((cat, idx) => (
              <FadeInView key={cat.id} delay={800 + (idx * 100)}>
                <ScalePressable style={styles.categoryItem}>
                  <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                    <Ionicons name={cat.icon} size={24} color={cat.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.catRow}>
                      <Text style={[styles.catName, isDark && styles.textWhite]}>{cat.name}</Text>
                      <Text style={[styles.catAmount, isDark && styles.textWhite]}>{cat.amount}</Text>
                    </View>
                    <View style={[styles.progressBarBg, isDark && styles.progressBarBgDark]}>
                      <View style={[styles.progressBarFill, { width: `${cat.percent * 100}%`, backgroundColor: cat.color }]} />
                    </View>
                  </View>
                </ScalePressable>
              </FadeInView>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Selection Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.textWhite]}>Select Period</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={isDark ? "#666" : "#CCC"} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={selectionList}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item === selectedLabel && (isDark ? styles.modalItemActiveDark : styles.modalItemActive)]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={[styles.modalItemText, isDark && styles.textWhite, item === selectedLabel && styles.modalItemTextActive]}>
                    {item}
                  </Text>
                  {item === selectedLabel && (
                    <Ionicons name="checkmark" size={20} color={isDark ? "#FFF" : "#1A1A1A"} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
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
    paddingTop: 12,
    gap: 24
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  title: {
    color: '#1A1A1A',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    padding: 3,
    borderRadius: 12,
    width: 160,
  },
  toggleDark: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 9,
  },
  toggleBtnActiveExp: {
    backgroundColor: '#FFEBEE',
  },
  toggleBtnActiveInc: {
    backgroundColor: '#E8F5E9',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9E9E9E',
  },
  toggleTextActiveExp: {
    color: '#FF5252',
  },
  toggleTextActiveInc: {
    color: '#4CAF50',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textBlack: {
    color: '#000',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 8,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    padding: 4,
    borderRadius: 16,
    marginBottom: 8,
  },
  segmentControlDark: {
    backgroundColor: '#1A1A1A',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentButtonActiveDark: {
    backgroundColor: '#333',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9E9E9E',
  },
  segmentTextActive: {
    color: '#1A1A1A',
  },
  segmentTextActiveDark: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    alignItems: 'center',
  },
  cardDark: {
    backgroundColor: '#1A1A1A',
    borderColor: '#333',
  },
  distributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 20,
  },
  chartWrapper: {
    width: '100%',
    marginBottom: 24,
  },
  distributionBarBg: {
    height: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  distributionBarBgDark: {
    backgroundColor: '#333',
  },
  distributionBarFill: {
    height: '100%',
  },
  legendWrapper: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  totalLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  healthyBadge: {
    backgroundColor: '#1A1A1A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  healthyBadgeDark: {
    backgroundColor: '#FFFFFF',
  },
  healthyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  unhealthyBadge: {
    backgroundColor: '#FF5252',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  unhealthyBadgeDark: {
    backgroundColor: '#FF5252',
  },
  badgeWrapper: {
    position: 'absolute',
    top: 24,
    right: 24,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  legendContainer: {
    width: '100%',
    gap: 12,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  categoriesSection: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  categoryList: {
    gap: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  catIcon: {
    width: 48,
    height: 48,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  catName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  catAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 3,
  },
  progressBarBgDark: {
    backgroundColor: '#333',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxHeight: '60%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    paddingBottom: 12,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  modalContentDark: {
    backgroundColor: '#1A1A1A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalItemActive: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 0,
  },
  modalItemActiveDark: {
    backgroundColor: '#222',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 0,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717A',
  },
  modalItemTextActive: {
    color: '#1A1A1A',
    fontWeight: '700',
  },
});