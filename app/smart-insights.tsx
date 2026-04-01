import { exportService } from '@/lib/export';
import { FinancialHealth, Insight, insightsService, SpendingComparison } from '@/lib/insights';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export default function SmartInsightsScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();

  const [smartInsights, setSmartInsights] = useState<Insight[]>([]);
  const [comparisons, setComparisons] = useState<SpendingComparison[]>([]);
  const [healthScore, setHealthScore] = useState<FinancialHealth | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadSmartInsights();
    }, [])
  );

  const loadSmartInsights = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [insightsData, comparisonsData, healthData] = await Promise.all([
        insightsService.generateInsights(user.id),
        insightsService.getSpendingComparison(user.id),
        insightsService.calculateFinancialHealth(user.id)
      ]);

      setSmartInsights(insightsData);
      setComparisons(comparisonsData.filter(c => c.currentMonth > 0 || c.lastMonth > 0));
      setHealthScore(healthData);
    } catch (error) {
      console.error('Error loading smart insights:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSmartInsights();
  }, []);

  const handleExport = async () => {
    try {
      setExporting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await exportService.downloadReport(user.id, {
        format: 'csv',
        includeIncome: true,
        includeExpenses: true
      });

      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return 'alert-circle';
      case 'success': return 'checkmark-circle';
      case 'suggestion': return 'bulb';
      default: return 'information-circle';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning': return '#FF5252';
      case 'success': return '#4CAF50';
      case 'suggestion': return '#2196F3';
      default: return '#757575';
    }
  };

  const getInsightBgColor = (type: string) => {
    switch (type) {
      case 'warning': return isDark ? '#3A1F1F' : '#FFEBEE';
      case 'success': return isDark ? '#1F3A1F' : '#E8F5E9';
      case 'suggestion': return isDark ? '#1F2A3A' : '#E3F2FD';
      default: return isDark ? '#2A2A2A' : '#F5F5F5';
    }
  };

  const renderComparison = ({ item }: { item: SpendingComparison }) => {
    const change = item.lastMonth > 0 ? ((item.currentMonth - item.lastMonth) / item.lastMonth) * 100 : 0;
    const isIncrease = change > 0;
    
    return (
      <View style={[styles.comparisonCard, isDark && styles.cardDark]}>
        <View style={styles.comparisonHeader}>
          <View style={[styles.catIcon, { backgroundColor: item.color + '20' }]}>
            <Ionicons name="pie-chart-outline" size={24} color={item.color} />
          </View>
          <Text style={[styles.comparisonName, isDark && styles.textWhite]}>{item.category}</Text>
        </View>
        <View style={styles.comparisonValues}>
          <View style={styles.comparisonColumn}>
            <Text style={styles.comparisonLabel}>This Month</Text>
            <Text style={[styles.comparisonAmount, isDark && styles.textWhite]}>
              ${item.currentMonth.toFixed(2)}
            </Text>
          </View>
          <View style={styles.changeColumn}>
            <Ionicons 
              name={isIncrease ? 'trending-up' : 'trending-down'} 
              size={20} 
              color={isIncrease ? '#FF5252' : '#4CAF50'} 
            />
            <Text style={[styles.changeText, { color: isIncrease ? '#FF5252' : '#4CAF50' }]}>
              {Math.abs(change).toFixed(0)}%
            </Text>
          </View>
          <View style={styles.comparisonColumn}>
            <Text style={styles.comparisonLabel}>Last Month</Text>
            <Text style={[styles.comparisonAmount, isDark && styles.textWhite]}>
              ${item.lastMonth.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, isDark && styles.bgDark, { paddingTop: insets.top }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDark ? "#FFF" : "#1A1A1A"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.textWhite]}>Smart Insights</Text>
        <TouchableOpacity 
          style={[styles.exportBtn, isDark && styles.exportBtnDark]}
          onPress={() => setShowExportModal(true)}
        >
          <Ionicons name="download-outline" size={20} color={isDark ? "#FFF" : "#1A1A1A"} />
        </TouchableOpacity>
      </View>

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
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, isDark && styles.textWhite]}>Loading insights...</Text>
          </View>
        ) : (
          <>
            {/* Financial Health Score */}
            {healthScore && (
              <FadeInView delay={0}>
                <View style={[styles.healthCard, isDark && styles.cardDark]}>
                  <LinearGradient
                    colors={isDark ? ['#1E1E24', '#2A2A35'] : ['#FFD54F', '#FFC107']}
                    style={styles.healthGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.scoreCircle}>
                      <Text style={[
                        styles.scoreText,
                        healthScore.score >= 80 ? styles.scoreGood :
                          healthScore.score >= 60 ? styles.scoreFair : styles.scorePoor
                      ]}>
                        {healthScore.score}
                      </Text>
                      <Text style={styles.scoreLabel}>Financial Health</Text>
                    </View>
                    <Text style={styles.healthDesc}>
                      {healthScore.score >= 80 ? 'Excellent financial health!' :
                        healthScore.score >= 60 ? 'Good progress, room for improvement' :
                          'Your finances need attention'}
                    </Text>
                  </LinearGradient>
                  <View style={styles.factorsRow}>
                    <View style={styles.factor}>
                      <Text style={[styles.factorValue, isDark && styles.textWhite]}>
                        {healthScore.factors.savingsRate.toFixed(0)}%
                      </Text>
                      <Text style={styles.factorLabel}>Savings</Text>
                    </View>
                    <View style={styles.factor}>
                      <Text style={[styles.factorValue, isDark && styles.textWhite]}>
                        {healthScore.factors.budgetAdherence.toFixed(0)}%
                      </Text>
                      <Text style={styles.factorLabel}>Budget</Text>
                    </View>
                    <View style={styles.factor}>
                      <Text style={[styles.factorValue, isDark && styles.textWhite]}>
                        {Math.max(0, 100 - healthScore.factors.expenseGrowth).toFixed(0)}%
                      </Text>
                      <Text style={styles.factorLabel}>Control</Text>
                    </View>
                  </View>
                </View>
              </FadeInView>
            )}

            {/* Smart Insights */}
            {smartInsights.length > 0 && (
              <FadeInView delay={100}>
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>Smart Insights</Text>
                  {smartInsights.map((insight) => (
                    <View 
                      key={insight.id} 
                      style={[styles.insightCard, { backgroundColor: getInsightBgColor(insight.type) }]}
                    >
                      <Ionicons
                        name={getInsightIcon(insight.type)}
                        size={24}
                        color={getInsightColor(insight.type)}
                      />
                      <View style={styles.insightContent}>
                        <Text style={[styles.insightTitle, isDark && styles.textWhite]}>{insight.title}</Text>
                        <Text style={[styles.insightMessage, isDark && styles.textMuted]}>{insight.message}</Text>
                        {insight.metric && (
                          <Text style={[styles.insightMetric, { color: getInsightColor(insight.type) }]}>
                            {insight.metric}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </FadeInView>
            )}

            {/* Spending Comparisons */}
            {comparisons.length > 0 && (
              <FadeInView delay={200}>
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>Spending Comparison</Text>
                  <Text style={[styles.sectionSubtitle, isDark && styles.textMuted]}>
                    This month vs last month
                  </Text>
                  <FlatList
                    data={comparisons.slice(0, 4)}
                    keyExtractor={(item) => item.category}
                    renderItem={renderComparison}
                    scrollEnabled={false}
                  />
                </View>
              </FadeInView>
            )}

            {/* No Data State */}
            {!loading && smartInsights.length === 0 && comparisons.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="analytics-outline" size={48} color={isDark ? "#666" : "#CCC"} />
                <Text style={[styles.emptyTitle, isDark && styles.textWhite]}>No Insights Yet</Text>
                <Text style={[styles.emptyText, isDark && styles.textMuted]}>
                  Add more transactions to get personalized insights about your spending habits.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Export Modal */}
      <Modal visible={showExportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.exportModalContent, isDark && styles.modalContentDark]}>
            <Text style={[styles.modalTitle, isDark && styles.textWhite]}>Export Report</Text>
            <Text style={[styles.modalSubtitle, isDark && styles.textMuted]}>
              Download your transaction history as CSV
            </Text>
            <TouchableOpacity
              style={[styles.exportActionBtn, exporting && styles.exportingBtn]}
              onPress={handleExport}
              disabled={exporting}
            >
              <Text style={styles.exportActionText}>
                {exporting ? 'Exporting...' : 'Download CSV'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  bgDark: {
    backgroundColor: '#0F0F12',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  exportBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exportBtnDark: {
    backgroundColor: '#1A1A1A',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#9E9E9E',
    marginBottom: 16,
    marginTop: -8,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textMuted: {
    color: '#9E9E9E',
  },
  // Health Card
  healthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardDark: {
    backgroundColor: '#1A1A1A',
    borderColor: '#333',
  },
  healthGradient: {
    padding: 24,
    alignItems: 'center',
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreText: {
    fontSize: 36,
    fontWeight: '800',
  },
  scoreGood: {
    color: '#4CAF50',
  },
  scoreFair: {
    color: '#FF9800',
  },
  scorePoor: {
    color: '#FF5252',
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  healthDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  factorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  factor: {
    alignItems: 'center',
  },
  factorValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  factorLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 2,
  },
  // Insight Cards
  insightCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  insightContent: {
    marginLeft: 12,
    flex: 1,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  insightMetric: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  // Comparison Cards
  comparisonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comparisonName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 12,
  },
  comparisonValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonColumn: {
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 11,
    color: '#9E9E9E',
    marginBottom: 4,
  },
  comparisonAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  changeColumn: {
    alignItems: 'center',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportModalContent: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalContentDark: {
    backgroundColor: '#1A1A1A',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9E9E9E',
    marginBottom: 24,
  },
  exportActionBtn: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  exportingBtn: {
    opacity: 0.6,
  },
  exportActionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 12,
  },
  cancelText: {
    color: '#9E9E9E',
    fontSize: 16,
    fontWeight: '600',
  },
});
