import { useCurrency } from '@/hooks/use-currency';
import { GoalProgress, SavingsGoal, savingsGoalService } from '@/lib/savings-goals';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

interface GoalWithProgress extends SavingsGoal {
  progress: GoalProgress;
}

const ProgressBar = ({ percentage, color = '#FFD54F', isDark = false }: { percentage: number; color?: string; isDark?: boolean }) => (
  <View style={styles.progressContainer}>
    <View style={[styles.progressBg, isDark && styles.progressBgDark]}>
      <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: color }]} />
    </View>
    <Text style={[styles.progressText, isDark && styles.textWhite]}>{percentage.toFixed(0)}%</Text>
  </View>
);

export default function SavingsGoalsScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [stats, setStats] = useState({
    totalGoals: 0,
    completedGoals: 0,
    totalSaved: 0,
    overallProgress: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const { format } = useCurrency();
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  
  // Form state
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');

  const loadGoals = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [goalsData, statsData] = await Promise.all([
        savingsGoalService.getAllGoals(user.id),
        savingsGoalService.getGoalStats(user.id)
      ]);

      const goalsWithProgress = goalsData.map(goal => ({
        ...goal,
        progress: savingsGoalService.calculateProgress(goal)
      }));

      setGoals(goalsWithProgress);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );

  const handleCreateGoal = async () => {
    if (!newGoalName || !newGoalTarget) {
      Alert.alert('Error', 'Please fill in goal name and target amount');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await savingsGoalService.createGoal(user.id, {
        name: newGoalName,
        target_amount: parseFloat(newGoalTarget),
        current_amount: parseFloat(newGoalCurrent) || 0,
        deadline: null
      });

      setShowAddModal(false);
      setNewGoalName('');
      setNewGoalTarget('');
      setNewGoalCurrent('');
      loadGoals();
    } catch (error) {
      Alert.alert('Error', 'Failed to create goal');
    }
  };

  const handleContribute = async () => {
    if (!selectedGoal || !contributionAmount) return;

    try {
      await savingsGoalService.addContribution(selectedGoal.id, parseFloat(contributionAmount));
      setShowContributeModal(false);
      setContributionAmount('');
      setSelectedGoal(null);
      loadGoals();
    } catch (error) {
      Alert.alert('Error', 'Failed to add contribution');
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this savings goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await savingsGoalService.deleteGoal(goalId);
              loadGoals();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete goal');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadGoals}
            tintColor={isDark ? "#FFD54F" : "#1A1A1A"}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, isDark && styles.textWhite]}>Savings Goals</Text>
            <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>Track your financial dreams</Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={24} color={isDark ? '#000' : '#1A1A1A'} />
          </Pressable>
        </View>

        {/* Stats Card */}
        <LinearGradient
          colors={isDark ? ['#1E1E24', '#2A2A35'] : ['#FFD54F', '#FFC107']}
          style={styles.statsCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, isDark && styles.statValueDark]}>{stats.totalGoals}</Text>
              <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Goals</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, isDark && styles.statValueDark]}>{stats.completedGoals}</Text>
              <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, isDark && styles.statValueDark]}>{format(stats.totalSaved)}</Text>
              <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Saved</Text>
            </View>
          </View>
          <View style={styles.overallProgress}>
            <Text style={[styles.progressLabel, isDark && styles.textGray]}>{'Overall Progress'}</Text>
            <ProgressBar percentage={stats.overallProgress} isDark={isDark} />
          </View>
        </LinearGradient>

        {/* Goals List */}
        <View style={styles.goalsSection}>
          <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>Your Goals</Text>
          
          {goals.length === 0 ? (
            <View style={[styles.emptyState, isDark && styles.cardDark]}>
              <Ionicons name="trophy-outline" size={48} color={isDark ? '#FFF' : '#9E9E9E'} />
              <Text style={[styles.emptyText, isDark && styles.textWhite]}>No savings goals yet</Text>
              <Text style={[styles.emptySubtext, isDark && styles.textGray]}>Create your first goal to start saving!</Text>
            </View>
          ) : (
            goals.map((goal) => (
              <View key={goal.id} style={[styles.goalCard, isDark && styles.cardDark]}>
                <View style={styles.goalHeader}>
                  <View style={[styles.goalIcon, isDark && styles.goalIconDark]}>
                    <Ionicons 
                      name={goal.status === 'completed' ? "trophy" : "wallet-outline"} 
                      size={24} 
                      color={goal.status === 'completed' ? '#4CAF50' : '#FFD54F'} 
                    />
                  </View>
                  <View style={styles.goalInfo}>
                    <Text style={[styles.goalName, isDark && styles.textWhite]}>{goal.name}</Text>
                    <Text style={[styles.goalAmount, isDark && styles.textGray]}>
                      {format(goal.current_amount)} of {format(goal.target_amount)}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleDeleteGoal(goal.id)}>
                    <Ionicons name="trash-outline" size={20} color="#FF5252" />
                  </Pressable>
                </View>

                <ProgressBar 
                  percentage={goal.progress.percentage} 
                  color={goal.status === 'completed' ? '#4CAF50' : '#FFD54F'}
                />

                {goal.progress.daysLeft !== null && (
                  <Text style={[styles.goalMeta, isDark && styles.textGray]}>
                    {goal.progress.daysLeft > 0 
                      ? `${goal.progress.daysLeft} days left • Need ${format(goal.progress.monthlyContributionNeeded || 0)}/month`
                      : 'Deadline passed'
                    }
                  </Text>
                )}

                {goal.status !== 'completed' && (
                  <Pressable 
                    style={styles.contributeBtn}
                    onPress={() => {
                      setSelectedGoal(goal);
                      setShowContributeModal(true);
                    }}
                  >
                    <Text style={[styles.contributeText, isDark && styles.textWhite]}>Add Contribution</Text>
                  </Pressable>
                )}

                {goal.status === 'completed' && (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.completedText}>Goal Achieved!</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, isDark && styles.cardDark]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.modalTitle, isDark && styles.textWhite]}>Create Savings Goal</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isDark && styles.textGray]}>Goal Name</Text>
                  <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    value={newGoalName}
                    onChangeText={setNewGoalName}
                    placeholder="e.g., New Car, Emergency Fund"
                    placeholderTextColor={isDark ? '#CCC' : '#999'}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isDark && styles.textGray]}>Target Amount ($)</Text>
                  <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    value={newGoalTarget}
                    onChangeText={setNewGoalTarget}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={isDark ? '#CCC' : '#999'}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isDark && styles.textGray]}>Current Savings (Optional)</Text>
                  <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    value={newGoalCurrent}
                    onChangeText={setNewGoalCurrent}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={isDark ? '#CCC' : '#999'}
                  />
                </View>

                <Pressable style={styles.createBtn} onPress={handleCreateGoal}>
                  <Text style={styles.createBtnText}>Create Goal</Text>
                </Pressable>
                <Pressable style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                  <Text style={[styles.cancelText, isDark && styles.textWhite]}>Cancel</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Contribute Modal */}
      <Modal visible={showContributeModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, isDark && styles.cardDark]}>
              <Text style={[styles.modalTitle, isDark && styles.textWhite]}>
                Add to {selectedGoal?.name}
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDark && styles.textGray]}>Contribution Amount ($)</Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={contributionAmount}
                  onChangeText={setContributionAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  autoFocus
                />
              </View>

              <Pressable style={styles.createBtn} onPress={handleContribute}>
                <Text style={styles.createBtnText}>Add Contribution</Text>
              </Pressable>
              <Pressable 
                style={styles.cancelBtn} 
                onPress={() => {
                  setShowContributeModal(false);
                  setContributionAmount('');
                  setSelectedGoal(null);
                }}
              >
                <Text style={[styles.cancelText, isDark && styles.textWhite]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  containerDark: {
    backgroundColor: '#0F0F12'
  },
  content: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  textWhite: {
    color: '#FFFFFF'
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD54F',
    justifyContent: 'center',
    alignItems: 'center'
  },
  statsCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20
  },
  stat: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A'
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
    marginTop: 4
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.1)'
  },
  overallProgress: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 16
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8
  },
  statValueDark: {
    color: '#FFFFFF'
  },
  statLabelDark: {
    color: '#CCCCCC'
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  progressBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 4
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    width: 45
  },
  progressBgDark: {
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  subtitleDark: {
    color: '#CCCCCC'
  },
  cardDark: {
    backgroundColor: '#1A1A1A'
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 24
  },
  cardDark: {
    backgroundColor: '#1A1A1A'
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 16
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  goalIconDark: {
    backgroundColor: '#2A2A35'
  },
  goalInfo: {
    flex: 1
  },
  goalName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  goalAmount: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  goalMeta: {
    fontSize: 13,
    color: '#666'
  },
  contributeBtn: {
    backgroundColor: '#FFD54F',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  contributeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 12
  },
  completedText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4CAF50'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 24
  },
  inputGroup: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A'
  },
  inputDark: {
    backgroundColor: '#2A2A2A',
    color: '#FFFFFF'
  },
  createBtn: {
    backgroundColor: '#FFD54F',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  cancelBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8
  },
  cancelText: {
    fontSize: 16,
    color: '#666'
  }
});
