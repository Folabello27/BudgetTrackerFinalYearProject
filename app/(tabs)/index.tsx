import { useIsland } from '@/components/ui/island-context';
import { Colors } from '@/constants/Colors';
import { useCurrency } from '@/hooks/use-currency';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Image,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

// --- Types ---

type Subscription = {
  id: string;
  name: string;
  amount: string;
  due: string;
  icon: string;
  color: string;
};

type SavingsGoalCard = {
  id: string;
  name: string;
  target: number;
  current: number;
  percentage: number;
  color: string;
};

type Activity = {
  id: string;
  label: string;
  category: string;
  amount: string;
  amountVal: number;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  note?: string;
  fullDate?: string;
  type: 'expense' | 'income' | 'subscription';
  rawItem?: any;
  rawDate: Date;
};

// --- Mock Data ---

const subscriptions: Subscription[] = [
  { id: '1', name: 'Netflix', amount: '15.99', due: 'Tomorrow', icon: 'tv-outline', color: '#FFEBEE' },
  { id: '2', name: 'Spotify', amount: '9.99', due: 'In 3 days', icon: 'musical-notes-outline', color: '#E3F2FD' },
  { id: '3', name: 'Figma', amount: '12.00', due: 'In 5 days', icon: 'logo-figma', color: '#E8F5E9' },
];

// Helper functions for mapping categories to UI
const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
  switch (category) {
    case 'Food': return 'fast-food-outline';
    case 'Transport': return 'car-sport-outline';
    case 'Utilities': return 'flash-outline';
    case 'Fun': return 'game-controller-outline';
    case 'Salary': return 'cash-outline';
    case 'Freelance': return 'briefcase-outline';
    case 'Invest': return 'trending-up-outline';
    case 'Gift': return 'gift-outline';
    case 'Savings': return 'stats-chart-outline';
    case 'Income': return 'wallet-outline';
    default: return 'cart-outline';
  }
};

const getCategoryColor = (category: string, isDark: boolean): string => {
  if (isDark) {
    switch (category) {
      case 'Food': return '#351C45';
      case 'Transport': return '#1A2E44';
      case 'Utilities': return '#443A1A';
      case 'Fun': return '#1A442E';
      case 'Salary': return '#1A442E';
      case 'Freelance': return '#351C45';
      case 'Invest': return '#1A2E44';
      case 'Gift': return '#441A1A';
      case 'Savings': return '#222';
      case 'Income': return '#1A4444';
      default: return '#222';
    }
  }
  switch (category) {
    case 'Food': return '#F3E5F5'; // Light Purple
    case 'Transport': return '#E3F2FD'; // Light Blue
    case 'Utilities': return '#FFF3E0'; // Light Orange
    case 'Fun': return '#E8F5E9'; // Light Green
    case 'Salary': return '#E8F5E9'; // Light Green
    case 'Freelance': return '#F3E5F5'; // Light Purple
    case 'Invest': return '#E3F2FD'; // Light Blue
    case 'Gift': return '#FFEBEE'; // Light Red
    case 'Savings': return '#F5F5F5'; // Grey
    case 'Income': return '#E0F2F1'; // Teal
    default: return '#FAFAFA'; // Grey
  }
};

// --- Sub-Components ---

const ScalePressable = ({ children, onPress, style }: { children: React.ReactNode, onPress?: () => void, style?: any }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

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
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {children}
    </Animated.View>
  );
};

const SubscriptionCard = ({ item }: { item: Subscription }) => (
  <ScalePressable
    style={[styles.subCard, { backgroundColor: item.color, borderColor: item.color }]}
    onPress={() => router.push({
      pathname: '/subscription-details',
      params: {
        id: item.id,
        name: item.name,
        amount: item.amount.replace('$', ''),
        period: 'MO',
        nextBill: item.due,
        icon: item.icon,
        color: item.color,
        status: 'active'
      }
    })}
  >
    <View style={[styles.subIcon, { backgroundColor: '#FFF' }]}>
      <Ionicons name={item.icon as any} size={20} color="#1A1A1A" />
    </View>
    <Text style={[styles.subName, { color: '#1A1A1A' }]} numberOfLines={1}>{item.name}</Text>
    <Text style={styles.subDue} numberOfLines={1}>{item.due}</Text>
    <Text style={[styles.subAmount, { color: '#1A1A1A' }]} numberOfLines={1}>{item.amount}</Text>
  </ScalePressable>
);

const GoalCard = ({ item, format }: { item: SavingsGoalCard, format: (amount: number) => string }) => (
  <ScalePressable
    style={[styles.goalCard, { backgroundColor: item.color, borderColor: item.color }]}
    onPress={() => router.push('/savings-goals')}
  >
    <View style={[styles.goalIcon, { backgroundColor: '#FFF' }]}>
      <Ionicons name="wallet-outline" size={20} color="#1A1A1A" />
    </View>
    <Text style={[styles.goalName, { color: '#1A1A1A' }]} numberOfLines={1}>{item.name}</Text>
    <View style={styles.goalProgressContainer}>
      <View style={styles.goalProgressBg}>
        <View style={[styles.goalProgressFill, { width: `${item.percentage}%` }]} />
      </View>
      <Text style={styles.goalPercentage}>{item.percentage.toFixed(0)}%</Text>
    </View>
    <Text style={[styles.goalAmount, { color: '#1A1A1A' }]} numberOfLines={1}>
      {format(item.current)} / {format(item.target)}
    </Text>
  </ScalePressable>
);

const ActivityItem = ({ item, isDark, onPress }: { item: Activity, isDark: boolean, onPress: () => void }) => (
  <ScalePressable
    style={[styles.activityItem, isDark ? styles.cardDark : styles.cardLight]}
    onPress={onPress}
  >
    <View style={styles.activityLeft}>
      <View style={[styles.activityIcon, { backgroundColor: item.bg }]}>
        <Ionicons name={item.icon} size={20} color={isDark ? "#FFF" : "#1A1A1A"} />
      </View>
      <View>
        <Text style={[styles.activityLabel, isDark && styles.textWhite]}>{item.label}</Text>
        <Text style={styles.activityCategory}>{item.category} • {item.time}</Text>
      </View>
    </View>
    <Text style={[styles.activityAmount, item.amount.startsWith('+') ? styles.incomeText : (isDark && styles.textWhite)]}>{item.amount}</Text>
  </ScalePressable>
);

const DetailRow = ({ label, value, last, isDark }: { label: string; value: string; last?: boolean; isDark?: boolean }) => (
  <View style={[styles.txDetailRow, !last && styles.detailBorder, !last && isDark && styles.detailBorderDark]}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, isDark && styles.textWhite]}>{value}</Text>
  </View>
);

// --- Main Screen ---

export default function HomeScreen() {
  const { theme } = useTheme();
  const { format } = useCurrency();
  const isDark = theme === 'dark';
  const colors = Colors[theme];

  const [firstName, setFirstName] = useState('Alex'); // Default fallback
  const [avatar, setAvatar] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dbSubs, setDbSubs] = useState<Subscription[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoalCard[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState(3000);
  const [dailyBudget, setDailyBudget] = useState(100);
  const [monthSpent, setMonthSpent] = useState(0);
  const [todaySpent, setTodaySpent] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [selectedTx, setSelectedTx] = useState<Activity | null>(null);
  const [trend, setTrend] = useState('+0%');
  const [trendType, setTrendType] = useState<'up' | 'down'>('up');
  const [refreshing, setRefreshing] = useState(false);
  const { showIsland } = useIsland();

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning ☀️';
    if (hour < 18) return 'Good Afternoon 🌤️';
    return 'Good Evening 🌙';
  })();

  useFocusEffect(
    useCallback(() => {
      getProfile();
      loadAvatar();
      fetchRealData();
    }, [theme])
  );

  async function getProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const metaName = user.user_metadata?.full_name;
        if (metaName) {
          setFirstName(metaName.split(' ')[0]);
        }
      }
    } catch (error) {
      console.log('Error fetching profile', error);
    }
  }

  const loadAvatar = async () => {
    try {
      const savedAvatar = await AsyncStorage.getItem('userAvatar');
      if (savedAvatar) {
        setAvatar(savedAvatar);
      }
    } catch (error) {
      console.log('Error loading avatar:', error);
    }
  };

  const processDueSubscriptions = async (userId: string) => {
    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const { data: dueSubs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .lte('next_bill', today.toISOString());

      if (!dueSubs || dueSubs.length === 0) return;

      for (const sub of dueSubs) {
        // 1. Create the expense transaction
        const { error: txErr } = await supabase.from('transactions').insert({
          user_id: userId,
          amount: sub.amount,
          category: 'Subscription',
          type: 'expense',
          date: new Date().toISOString(),
          note: `Auto-payment: ${sub.name}`
        });

        if (txErr) continue;

        // 2. Calculate next billing date
        const currentNext = new Date(sub.next_bill);
        const newNext = new Date(currentNext);
        if (sub.period === 'YR') {
          newNext.setFullYear(currentNext.getFullYear() + 1);
        } else {
          newNext.setMonth(currentNext.getMonth() + 1);
        }

        // 3. Update the subscription record
        await supabase
          .from('subscriptions')
          .update({ next_bill: newNext.toISOString() })
          .eq('id', sub.id);
      }
    } catch (e) {
      console.log('Error processing auto-deduct:', e);
    }
  };

  const fetchRealData = async (isManualRefresh = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // New: Process any due subscriptions first
      await processDueSubscriptions(user.id);

      // 1. Fetch User Budget Settings
      const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_budget, daily_budget')
        .eq('id', user.id)
        .single();

      const limit = profile?.monthly_budget || 3000;
      const dLimit = profile?.daily_budget || 100;
      setMonthlyBudget(limit);
      setDailyBudget(dLimit);

      // 2. Fetch Transactions for the current month (for budget progress)
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: monthTx } = await supabase
        .from('transactions')
        .select('amount, type')
        .gte('date', startOfMonth);

      const totalMonthSpent = monthTx?.filter(tx => tx.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const totalMonthIncome = monthTx?.filter(tx => tx.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      setMonthSpent(totalMonthSpent);
      setMonthIncome(totalMonthIncome);

      // 3. Fetch Transactions for today (for daily budget progress)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const { data: todayTx } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'expense')
        .gte('date', startOfToday.toISOString());

      const totalTodaySpent = todayTx?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      setTodaySpent(totalTodaySpent);

      // 4. Fetch This Week vs Last Week for Trend
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const { data: thisWeekTx } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'expense')
        .gte('date', oneWeekAgo.toISOString());

      const { data: lastWeekTx } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'expense')
        .gte('date', twoWeeksAgo.toISOString())
        .lt('date', oneWeekAgo.toISOString());

      const thisWeekTotal = thisWeekTx?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const lastWeekTotal = lastWeekTx?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      if (lastWeekTotal > 0) {
        const diff = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
        setTrend(`${diff >= 0 ? '+' : ''}${diff.toFixed(0)}%`);
        setTrendType(diff >= 0 ? 'up' : 'down');
      } else {
        setTrend(thisWeekTotal > 0 ? '+100%' : '0%');
        setTrendType('up');
      }

      // 5. Fetch Recent Transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(10);

      // 2. Fetch Subscriptions for Radar (Upcoming)
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('next_bill', { ascending: true })
        .limit(20);

      if (txError) console.log('TX Error:', txError);
      if (subError) console.log('Sub Error:', subError);

      // 3. Map Transactions to Activity
      // ... (no changes needed here, but I'll include it for context if necessary)
      // Actually, I should probably keep the mappedTransactions logic as is.
      const mappedTransactions: Activity[] = (txData || []).map((tx: any) => {
        const isExpense = tx.type === 'expense';
        const tDate = new Date(tx.date);
        return {
          id: tx.id,
          label: tx.note || tx.category || 'Transaction',
          category: tx.category || (isExpense ? 'Expense' : 'Income'),
          amount: (isExpense ? '-' : '+') + format(Math.abs(Number(tx.amount))),
          amountVal: Number(tx.amount),
          time: tDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          fullDate: tDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
          icon: getCategoryIcon(tx.category),
          bg: getCategoryColor(tx.category, isDark),
          rawDate: tDate,
          note: tx.note || '',
          type: tx.type
        };
      });

      // 4. Map Subscriptions to Activity
      const mappedSubscriptions: Activity[] = (subData || []).map((sub: any) => {
        const tDate = new Date(sub.created_at || Date.now());
        return {
          id: sub.id,
          label: sub.name,
          category: 'Subscription',
          amount: '-' + format(Number(sub.amount)),
          amountVal: Number(sub.amount),
          time: tDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          fullDate: tDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
          icon: (sub.icon as any) || 'apps-outline',
          bg: isDark ? '#333' : (sub.color || '#F5F5F5'),
          rawDate: tDate,
          type: 'subscription',
          note: sub.description || '',
          rawItem: sub
        };
      });

      // 5. Merge and Sort Activities
      const combined = [...mappedTransactions, ...mappedSubscriptions]
        .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
        .slice(0, 5);

      setActivities(combined);

      // 6. Update Subscription Radar (Upcoming)
      if (subData) {
        const todayAtMidnight = new Date();
        todayAtMidnight.setHours(0, 0, 0, 0);

        const radarSubs: Subscription[] = subData
          .filter((s: any) => {
            const next = new Date(s.next_bill);
            next.setHours(23, 59, 59, 999); // Include anything due today
            return next >= todayAtMidnight;
          })
          .slice(0, 4)
          .map((s: any, index: number) => {
            const next = new Date(s.next_bill);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const nextDay = new Date(s.next_bill);
            nextDay.setHours(0, 0, 0, 0);

            const diff = Math.ceil((nextDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            let dueText = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `In ${diff} days`;

            const radarColors = ['#FFE4E6', '#DBEAFE', '#DCFCE7', '#FEF3C7', '#F3E8FF', '#E0E7FF'];
            const amount = Number(s.amount);
            return {
              id: s.id,
              name: s.name,
              amount: format(isNaN(amount) ? 0 : amount),
              due: dueText,
              icon: s.icon,
              color: radarColors[index % radarColors.length]
            };
          });
        setDbSubs(radarSubs);
      }

      // 7. Fetch Savings Goals
      try {
        const { data: goalsData } = await supabase
          .from('savings_goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(4);

        if (goalsData) {
          const goalColors = ['#E8F5E9', '#E3F2FD', '#FFF3E0', '#F3E5F5'];
          const mappedGoals: SavingsGoalCard[] = goalsData.map((g: any, index: number) => ({
            id: g.id,
            name: g.name,
            target: Number(g.target_amount),
            current: Number(g.current_amount),
            percentage: Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100),
            color: goalColors[index % goalColors.length]
          }));
          setSavingsGoals(mappedGoals);
        }
      } catch (e) {
        console.log('Error loading savings goals:', e);
      }
    } catch (error) {
      console.log('Main fetch error:', error);
    } finally {
      setRefreshing(false);
      if (isManualRefresh) {
        showIsland('success', 'Your finances are up to date!');
      }
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    showIsland('syncing', 'Syncing your financial dashboard...');
    fetchRealData(true);
  }, [showIsland]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatar(uri);
      try {
        await AsyncStorage.setItem('userAvatar', uri);
      } catch (error) {
        console.log('Error saving avatar:', error);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.bgDark]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? "#FFD54F" : "#1A1A1A"}
            colors={["#FFD54F"]}
          />
        }
      >
        {/* Header Section */}
        <FadeInView delay={100} style={styles.header}>
          <Pressable onPress={pickImage} style={styles.headerLeft}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, isDark && styles.avatarDark]}>
                <Ionicons name="person" size={20} color={isDark ? "#666" : "#CCCCCC"} />
              </View>
            )}
            <View>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={[styles.username, isDark && styles.textWhite]}>{firstName}</Text>
            </View>
          </Pressable>
          <ScalePressable onPress={() => router.push('/notifications')} style={[styles.bellButton, isDark && styles.bellDark]}>
            <Ionicons name="notifications-outline" size={24} color={isDark ? "#FFF" : "#1A1A1A"} />
            <View style={styles.bellBadge} />
          </ScalePressable>
        </FadeInView>

        {/* Hero Budget Card - Redesigned */}
        <FadeInView delay={300}>
          <View style={[styles.balanceCard, isDark && styles.balanceCardDark]}>
            {/* Top Section: Balance & Trend */}
            <View style={styles.balanceHeader}>
              <View>
                <Text style={[styles.balanceLabel, isDark && styles.textSecondaryDark]}>Total Balance</Text>
                <Text style={[styles.balanceAmount, isDark && styles.textWhite]}>
                  {format(monthIncome - monthSpent)}
                </Text>
              </View>
              <View style={[styles.trendPill, trendType === 'down' && styles.trendPillDown]}>
                <Ionicons 
                  name={trendType === 'up' ? "trending-up" : "trending-down"} 
                  size={14} 
                  color={trendType === 'up' ? '#4CAF50' : '#FF5252'} 
                />
                <Text style={[styles.trendPillText, { color: trendType === 'up' ? '#4CAF50' : '#FF5252' }]}>
                  {trend}
                </Text>
              </View>
            </View>

            {/* Progress Bar for Daily Budget */}
            <View style={styles.balanceProgressContainer}>
              <View style={styles.balanceProgressHeader}>
                <Text style={[styles.balanceProgressLabel, isDark && styles.textSecondaryDark]}>
                  Daily Budget
                </Text>
                <Text style={[styles.balanceProgressValue, isDark && styles.textWhite]}>
                  {format(todaySpent)} <Text style={[styles.balanceProgressTotal, isDark && styles.textSecondaryDark]}>/ {format(dailyBudget)}</Text>
                </Text>
              </View>
              <View style={[styles.balanceProgressTrack, isDark && styles.balanceProgressTrackDark]}>
                <View 
                  style={[
                    styles.balanceProgressFill, 
                    { 
                      width: `${Math.min((todaySpent / dailyBudget) * 100, 100)}%`,
                      backgroundColor: todaySpent > dailyBudget ? '#FF5252' : (isDark ? '#FFD54F' : '#1A1A1A')
                    }
                  ]} 
                />
              </View>
            </View>

            {/* Income & Expense Row */}
            <View style={styles.balanceStats}>
              <View style={styles.balanceStatItem}>
                <View style={styles.balanceStatIconWrap}>
                  <View style={[styles.balanceStatIcon, { backgroundColor: '#4CAF5015' }]}>
                    <Ionicons name="arrow-down" size={16} color="#4CAF50" />
                  </View>
                </View>
                <View>
                  <Text style={[styles.balanceStatLabel, isDark && styles.textSecondaryDark]}>Income</Text>
                  <Text style={[styles.balanceStatValue, isDark && styles.textWhite]}>{format(monthIncome)}</Text>
                </View>
              </View>
              
              <View style={styles.balanceStatDivider} />
              
              <View style={styles.balanceStatItem}>
                <View style={styles.balanceStatIconWrap}>
                  <View style={[styles.balanceStatIcon, { backgroundColor: '#FF525215' }]}>
                    <Ionicons name="arrow-up" size={16} color="#FF5252" />
                  </View>
                </View>
                <View>
                  <Text style={[styles.balanceStatLabel, isDark && styles.textSecondaryDark]}>Expenses</Text>
                  <Text style={[styles.balanceStatValue, isDark && styles.textWhite]}>{format(monthSpent)}</Text>
                </View>
              </View>
            </View>
          </View>
        </FadeInView>

        {/* Subscriptions Section */}
        <FadeInView delay={500} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>Subscription Radar</Text>
            <Pressable onPress={() => router.push('/subscriptions')}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subListContainer}
          >
            {dbSubs.length > 0 ? (
              dbSubs.map((item) => (
                <View key={item.id} style={{ marginRight: 16 }}>
                  <SubscriptionCard item={item} />
                </View>
              ))
            ) : (
              <Text style={{ color: '#9E9E9E', marginLeft: 4 }}>No subscriptions tracked yet.</Text>
            )}
          </ScrollView>
        </FadeInView>

        {/* Savings Goals Section */}
        <FadeInView delay={600} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>Savings Goals</Text>
            <Pressable onPress={() => router.push('/savings-goals')}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subListContainer}
          >
            {savingsGoals.length > 0 ? (
              savingsGoals.map((item) => (
                <View key={item.id} style={{ marginRight: 16 }}>
                  <GoalCard item={item} format={format} />
                </View>
              ))
            ) : (
              <Text style={{ color: '#9E9E9E', marginLeft: 4 }}>No savings goals yet. Create one!</Text>
            )}
          </ScrollView>
        </FadeInView>

        {/* Activity Section */}
        <FadeInView delay={700} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>Recent Activity</Text>
            <Pressable onPress={() => router.push('/transactions')}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          <View style={styles.activityGroup}>
            {activities.length > 0 ? (
              activities.map((activity, idx) => (
                <FadeInView key={activity.id} delay={800 + (idx * 100)}>
                  <ActivityItem
                    item={activity}
                    isDark={isDark}
                    onPress={() => {
                      if (activity.type === 'subscription') {
                        router.push({
                          pathname: '/subscription-details',
                          params: {
                            id: activity.id,
                            name: activity.label,
                            amount: Math.abs(activity.amountVal).toString(),
                            icon: activity.icon,
                            color: activity.bg,
                            status: activity.rawItem?.status || 'active'
                          }
                        });
                      } else {
                        setSelectedTx(activity);
                      }
                    }}
                  />
                </FadeInView>
              ))
            ) : (
              <Text style={{ color: '#9E9E9E', fontStyle: 'italic' }}>No recent activity (Start adding transaction!)</Text>
            )}
          </View>
        </FadeInView>
      </ScrollView>



      {/* Transaction Detail Modal */}
      <Modal visible={!!selectedTx} animationType="slide" transparent>
        <View style={styles.txModalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setSelectedTx(null)} />
          <View style={[styles.txModalContent, isDark && styles.txModalContentDark]}>
            <View style={styles.txModalHandle} />
            {selectedTx && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 24 }}>
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <View style={[styles.txLargeIcon, isDark && styles.txIconBoxDark]}>
                      <Ionicons name={selectedTx.icon as any} size={32} color="#FFF" />
                    </View>
                    <Text style={[styles.txModalMerchant, isDark && styles.textWhite]}>{selectedTx.category}</Text>
                    <Text style={[styles.txModalAmount, selectedTx.type === 'income' ? styles.incomeText : (isDark ? styles.textWhite : styles.txOutflow)]}>
                      {selectedTx.amount}
                    </Text>
                  </View>

                  <View style={[styles.txInfoCard, isDark && styles.txInfoCardDark]}>
                    <DetailRow label="Date" value={selectedTx.fullDate || ''} isDark={isDark} />
                    <DetailRow label="Type" value={selectedTx.type.charAt(0).toUpperCase() + selectedTx.type.slice(1)} isDark={isDark} />
                    <DetailRow label="Category" value={selectedTx.category} isDark={isDark} />
                    <DetailRow label="Notes" value={selectedTx.note || 'None'} isDark={isDark} last />
                  </View>

                  <Pressable onPress={() => setSelectedTx(null)} style={[styles.txCloseBtn, isDark && styles.txCloseBtnDark]}>
                    <Text style={[styles.txCloseBtnText, isDark && styles.textBlack]}>Dismiss</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  bgDark: {
    backgroundColor: '#0F0F12',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 12,
    gap: 32,
    paddingBottom: 100, // Space for FAB
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  avatarDark: {
    backgroundColor: '#1A1A1A',
    borderColor: '#333',
  },
  greeting: {
    color: '#9E9E9E',
    fontSize: 14,
    fontWeight: '500',
  },
  username: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: '700',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textBlack: {
    color: '#000000',
  },
  textGray: {
    color: '#9E9E9E',
  },
  bellButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5252',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  bellDark: {
    backgroundColor: '#1A1A1A',
    borderColor: '#333',
  },
  // New Balance Card Styles
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  balanceCardDark: {
    backgroundColor: '#1A1A1A',
    borderColor: '#333',
    shadowColor: '#000',
    shadowOpacity: 0.2,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717A',
    marginBottom: 4,
  },
  textSecondaryDark: {
    color: '#A1A1AA',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    gap: 4,
  },
  trendPillDown: {
    backgroundColor: '#FEF2F2',
  },
  trendPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  balanceProgressContainer: {
    marginBottom: 20,
  },
  balanceProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceProgressLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717A',
  },
  balanceProgressValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  balanceProgressTotal: {
    fontWeight: '400',
    color: '#A1A1AA',
  },
  balanceProgressTrack: {
    height: 6,
    backgroundColor: '#F4F4F5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  balanceProgressTrackDark: {
    backgroundColor: '#27272A',
  },
  balanceProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  balanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F4F4F5',
  },
  balanceStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  balanceStatIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717A',
    marginBottom: 2,
  },
  balanceStatValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  balanceStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#F4F4F5',
    marginHorizontal: 16,
  },
  heroCard: {
    borderRadius: 32,
    padding: 24,
    paddingVertical: 28,
    shadowColor: '#FFD54F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  heroCardDark: {
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1A1A',
    opacity: 0.6,
    letterSpacing: 1,
    marginBottom: 4,
  },
  trendBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  trendBadgeDown: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  budgetProgressSection: {
    marginBottom: 24,
  },
  budgetProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetProgressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    opacity: 0.7,
  },
  budgetProgressValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarBgDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  overspendText: {
    color: '#FF5252',
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 24,
  },
  statMiniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statMiniIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statMiniLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A1A1A',
    opacity: 0.5,
    letterSpacing: 0.5,
  },
  statMiniValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  statMiniDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    zIndex: 10,
  },
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9E9E9E',
  },
  subListContainer: {
    flexDirection: 'row',
    paddingBottom: 4,
  },
  cardLight: {
    backgroundColor: '#FAFAFA',
    borderColor: '#F5F5F5',
  },
  cardDark: {
    backgroundColor: '#1A1A1A',
    borderColor: '#333',
  },
  subCard: {
    width: 140,
    height: 170,
    padding: 16,
    paddingVertical: 20,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1,
  },
  subIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  subName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  subDue: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  subAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 4,
  },
  goalCard: {
    width: 160,
    height: 180,
    padding: 16,
    paddingVertical: 20,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  goalName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  goalProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  goalProgressBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  goalPercentage: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4CAF50',
    width: 35,
  },
  goalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 4,
  },
  activityGroup: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  activityCategory: {
    fontSize: 13,
    color: '#9E9E9E',
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  incomeText: {
    color: '#4CAF50',
  },
  txModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  txModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  txModalContentDark: {
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderColor: '#333',
  },
  txModalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  txLargeIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  txIconBoxDark: {
    backgroundColor: '#333',
  },
  txModalMerchant: {
    color: '#1A1A1A',
    fontSize: 24,
    fontWeight: '700',
  },
  txModalAmount: {
    fontSize: 32,
    fontWeight: '800',
  },
  txOutflow: {
    color: '#1A1A1A',
  },
  txInfoCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
    marginTop: 8,
  },
  txInfoCardDark: {
    backgroundColor: '#222',
    borderColor: '#333',
  },
  txDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  detailBorder: {
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  detailBorderDark: {
    borderColor: '#333',
  },
  detailLabel: {
    color: '#71717A',
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    marginLeft: 20,
  },
  txCloseBtn: {
    backgroundColor: '#1A1A1A',
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  txCloseBtnDark: {
    backgroundColor: '#FFF',
  },
  txCloseBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
  },
});