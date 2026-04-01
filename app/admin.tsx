import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- Types ---

interface User {
  user_id: string;
  user_email: string;
  user_full_name: string;
  user_role: string;
  user_created_at: string;
}

interface Transaction {
  tx_id: string;
  tx_user_id: string;
  tx_amount: number;
  tx_type: 'expense' | 'income';
  tx_category: string;
  tx_description: string;
  tx_date: string;
  user_email?: string;
}

interface Stats {
  totalUsers: number;
  totalTransactions: number;
  totalVolume: number;
  newUsersToday: number;
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  created_at: string;
  user_email?: string;
}

// --- Components ---

const Card = ({ children, style }: { children: React.ReactNode; style?: any }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <View style={[styles.card, isDark && styles.cardDark, style]}>
      {children}
    </View>
  );
};

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'admin' | 'success' | 'warning' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const variantStyles = {
    default: { bg: isDark ? '#27272a' : '#f4f4f5', text: isDark ? '#a1a1aa' : '#71717a' },
    admin: { bg: '#dc2626', text: '#fff' },
    success: { bg: isDark ? '#14532d' : '#dcfce7', text: isDark ? '#86efac' : '#16a34a' },
    warning: { bg: isDark ? '#713f12' : '#fef9c3', text: isDark ? '#fde047' : '#854d0e' },
  };
  
  const style = variantStyles[variant];
  
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.badgeText, { color: style.text }]}>{children}</Text>
    </View>
  );
};

const Button = ({ 
  children, 
  onPress, 
  variant = 'default',
  size = 'default',
  icon,
  danger,
  style
}: { 
  children: React.ReactNode; 
  onPress: () => void; 
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm';
  icon?: string;
  danger?: boolean;
  style?: any;
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const baseStyle = styles.button;
  const sizeStyle = size === 'sm' ? styles.buttonSm : styles.buttonDefault;
  
  let variantStyle;
  if (danger) {
    variantStyle = { bg: isDark ? 'rgba(220,38,38,0.2)' : '#fef2f2', text: '#dc2626', border: isDark ? '#7f1d1d' : '#fecaca' };
  } else if (variant === 'default') {
    variantStyle = { bg: isDark ? '#fff' : '#18181b', text: isDark ? '#18181b' : '#fff', border: 'transparent' };
  } else if (variant === 'outline') {
    variantStyle = { bg: 'transparent', text: isDark ? '#fff' : '#18181b', border: isDark ? '#27272a' : '#e4e4e7' };
  } else {
    variantStyle = { bg: 'transparent', text: isDark ? '#a1a1aa' : '#71717a', border: 'transparent' };
  }
  
  return (
    <Pressable 
      style={({ pressed }) => [
        baseStyle, 
        sizeStyle, 
        { backgroundColor: variantStyle.bg, borderColor: variantStyle.border },
        pressed && styles.buttonPressed,
        variant === 'outline' && { borderWidth: 1 },
        style
      ]} 
      onPress={onPress}
    >
      {icon && <Ionicons name={icon as any} size={size === 'sm' ? 14 : 16} color={variantStyle.text} style={styles.buttonIcon} />}
      <Text style={[styles.buttonText, { color: variantStyle.text }, size === 'sm' && styles.buttonTextSm]}>
        {children}
      </Text>
    </Pressable>
  );
};

const Input = ({ 
  placeholder, 
  value, 
  onChangeText,
  icon
}: { 
  placeholder: string; 
  value: string; 
  onChangeText: (text: string) => void;
  icon?: string;
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
      {icon && <Ionicons name={icon as any} size={16} color={isDark ? '#71717a' : '#a1a1aa'} style={styles.inputIcon} />}
      <TextInput
        style={[styles.input, isDark && styles.inputDark]}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#71717a' : '#a1a1aa'}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
};

const Separator = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return <View style={[styles.separator, isDark && styles.separatorDark]} />;
};

// --- Main Screen ---

export default function AdminDashboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalTransactions: 0, totalVolume: 0, newUsersToday: 0 });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'transactions' | 'audit'>('overview');

  const checkAdminStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setIsAdmin(profile?.role === 'admin');
    } catch (error) {
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      // Use RPC functions that bypass RLS
      const { data: usersData, error: usersError } = await supabase
        .rpc('admin_get_all_users');

      if (usersError) throw usersError;

      const { data: transactionsData, error: txError } = await supabase
        .rpc('admin_get_all_transactions');

      if (txError) throw txError;

      // Calculate stats
      const totalUsers = usersData?.length || 0;
      const totalTransactions = transactionsData?.length || 0;
      const totalVolume = transactionsData?.reduce((sum, t) => sum + Number(t.tx_amount), 0) || 0;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newUsersToday = usersData?.filter(u => new Date(u.user_created_at) >= today).length || 0;

      setStats({ totalUsers, totalTransactions, totalVolume, newUsersToday });
      setUsers(usersData || []);

      // Enrich transactions with user emails
      const userMap = new Map(usersData?.map(u => [u.user_id, u.user_email]) || []);
      const enrichedTransactions = transactionsData?.map(t => ({
        ...t,
        user_email: userMap.get(t.tx_user_id) || 'Unknown'
      })) || [];
      setTransactions(enrichedTransactions);

      // Fetch audit logs
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!auditError && auditData) {
        const enrichedAudit = auditData.map(a => ({
          ...a,
          user_email: userMap.get(a.user_id) || 'Unknown'
        }));
        setAuditLogs(enrichedAudit);
      }

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useFocusEffect(useCallback(() => { checkAdminStatus(); }, [checkAdminStatus]));
  useFocusEffect(useCallback(() => { if (isAdmin) loadData(); }, [isAdmin, loadData]));

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u => 
      u.user_full_name?.toLowerCase().includes(q) || 
      u.user_email?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.rpc('admin_update_user_role', {
        target_user_id: userId,
        new_role: newRole
      });
      if (error) throw error;
      setUsers(users.map(u => u.user_id === userId ? { ...u, user_role: newRole } : u));
      Alert.alert('Success', `Role updated to ${newRole}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update role');
    }
  };

  const handleDeleteUser = (userId: string) => {
    Alert.alert('Delete User', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          // In production: use Supabase Auth admin API
          setUsers(users.filter(u => u.user_id !== userId));
          setShowUserModal(false);
        }
      }
    ]);
  };

  // --- Unauthorized State ---
  if (checkingAdmin) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <Text style={[styles.textMuted, isDark && styles.textMutedDark]}>Checking...</Text>
        </View>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
            <Ionicons name="lock-closed" size={32} color={isDark ? '#52525b' : '#a1a1aa'} />
          </View>
          <Text style={[styles.heading, isDark && styles.headingDark, { marginTop: 16 }]}>
            Access Denied
          </Text>
          <Text style={[styles.textMuted, isDark && styles.textMutedDark, { marginTop: 8, textAlign: 'center' }]}>
            You don't have permission to view this page.
          </Text>
          <Button onPress={() => router.back()} variant="outline" style={{ marginTop: 24 }}>
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  // --- Render ---
  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.heading, isDark && styles.headingDark]}>Admin</Text>
            <Text style={[styles.textMuted, isDark && styles.textMutedDark]}>System Dashboard</Text>
          </View>
          <Badge variant="admin">ADMIN</Badge>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['overview', 'users', 'transactions', 'audit'] as const).map(tab => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && (isDark ? styles.tabActiveDark : styles.tabActive),
              ]}
            >
              <Text style={[
                styles.tabText,
                isDark && styles.tabTextDark,
                activeTab === tab && (isDark ? styles.tabTextActiveDark : styles.tabTextActive)
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Overview</Text>
            
            <View style={styles.statsGrid}>
              <Card>
                <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Total Users</Text>
                <Text style={[styles.statValue, isDark && styles.statValueDark]}>{stats.totalUsers}</Text>
                {stats.newUsersToday > 0 && (
                  <Badge variant="success">+{stats.newUsersToday} today</Badge>
                )}
              </Card>
              
              <Card>
                <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Transactions</Text>
                <Text style={[styles.statValue, isDark && styles.statValueDark]}>{stats.totalTransactions}</Text>
              </Card>
              
              <Card style={styles.fullWidthCard}>
                <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Total Volume</Text>
                <Text style={[styles.statValueLarge, isDark && styles.statValueDark]}>
                  ${stats.totalVolume.toLocaleString()}
                </Text>
              </Card>
            </View>

            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark, { marginTop: 24 }]}>
              Recent Users
            </Text>
            <Card>
              {users.slice(0, 5).map((user, i) => (
                <View key={user.user_id}>
                  {i > 0 && <Separator />}
                  <Pressable 
                    style={styles.userRowCompact}
                    onPress={() => { setSelectedUser(user); setShowUserModal(true); }}
                  >
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, isDark && styles.userNameDark]}>
                        {user.user_full_name || 'Unnamed'}
                      </Text>
                      <Text style={[styles.userEmail, isDark && styles.userEmailDark]}>
                        {user.user_email}
                      </Text>
                    </View>
                    {user.user_role === 'admin' && <Badge variant="admin">Admin</Badge>}
                  </Pressable>
                </View>
              ))}
              {users.length === 0 && (
                <Text style={[styles.textMuted, isDark && styles.textMutedDark]}>No users yet</Text>
              )}
            </Card>
          </View>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Users</Text>
            
            <Input 
              placeholder="Search users..." 
              value={searchQuery} 
              onChangeText={setSearchQuery}
              icon="search"
            />
            
            <Card style={{ marginTop: 16 }}>
              {filteredUsers.map((user, i) => (
                <View key={user.user_id}>
                  {i > 0 && <Separator />}
                  <Pressable 
                    style={styles.userRowFull}
                    onPress={() => { setSelectedUser(user); setShowUserModal(true); }}
                  >
                    <View style={styles.userInfoFull}>
                      <View style={styles.userMain}>
                        <Text style={[styles.userName, isDark && styles.userNameDark]}>
                          {user.user_full_name || 'Unnamed'}
                        </Text>
                        <Text style={[styles.userEmail, isDark && styles.userEmailDark]}>
                          {user.user_email}
                        </Text>
                      </View>
                      <View style={styles.userMetaRow}>
                        <Text style={[styles.userDate, isDark && styles.userDateDark]}>
                          {new Date(user.user_created_at).toLocaleDateString()}
                        </Text>
                        {user.user_role === 'admin' && <Badge variant="admin">Admin</Badge>}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={isDark ? '#52525b' : '#a1a1aa'} />
                  </Pressable>
                </View>
              ))}
              {filteredUsers.length === 0 && (
                <Text style={[styles.textMuted, isDark && styles.textMutedDark, { padding: 16 }]}>
                  No users found
                </Text>
              )}
            </Card>
          </View>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Transactions</Text>
            
            <Card>
              {transactions.map((t, i) => (
                <View key={t.tx_id}>
                  {i > 0 && <Separator />}
                  <View style={styles.transactionRow}>
                    <View style={styles.transactionMain}>
                      <Text style={[styles.transactionDesc, isDark && styles.transactionDescDark]}>
                        {t.tx_description || t.tx_category}
                      </Text>
                      <Text style={[styles.transactionMeta, isDark && styles.transactionMetaDark]}>
                        {t.user_email} • {new Date(t.tx_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={[
                        styles.transactionAmount,
                        t.tx_type === 'income' ? styles.incomeText : styles.expenseText
                      ]}>
                        {t.tx_type === 'income' ? '+' : '-'}${Number(t.tx_amount).toFixed(2)}
                      </Text>
                      <Badge variant={t.tx_type === 'income' ? 'success' : 'default'}>
                        {t.tx_type}
                      </Badge>
                    </View>
                  </View>
                </View>
              ))}
              {transactions.length === 0 && (
                <Text style={[styles.textMuted, isDark && styles.textMutedDark, { padding: 16 }]}>
                  No transactions yet
                </Text>
              )}
            </Card>
          </View>
        )}
        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Audit Logs</Text>
            
            <Card>
              {auditLogs.map((log, i) => (
                <View key={log.id}>
                  {i > 0 && <Separator />}
                  <View style={styles.auditRow}>
                    <View style={styles.auditMain}>
                      <View style={styles.auditHeader}>
                        <Badge variant={log.action === 'DELETE' ? 'warning' : log.action === 'CREATE' ? 'success' : 'default'}>
                          {log.action}
                        </Badge>
                        <Text style={[styles.auditTable, isDark && styles.auditTableDark]}>
                          {log.table_name}
                        </Text>
                      </View>
                      <Text style={[styles.auditMeta, isDark && styles.auditMetaDark]}>
                        {log.user_email} • {new Date(log.created_at).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
              {auditLogs.length === 0 && (
                <Text style={[styles.textMuted, isDark && styles.textMutedDark, { padding: 16 }]}>
                  No audit logs yet
                </Text>
              )}
            </Card>
          </View>
        )}
      </ScrollView>

      {/* User Modal */}
      <Modal visible={showUserModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>User Details</Text>
              <Pressable onPress={() => setShowUserModal(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#71717a' : '#71717a'} />
              </Pressable>
            </View>

            {selectedUser && (
              <>
                <View style={styles.modalSection}>
                  <Text style={[styles.label, isDark && styles.labelDark]}>Name</Text>
                  <Text style={[styles.value, isDark && styles.valueDark]}>{selectedUser.user_full_name || 'N/A'}</Text>
                </View>
                
                <View style={styles.modalSection}>
                  <Text style={[styles.label, isDark && styles.labelDark]}>Email</Text>
                  <Text style={[styles.value, isDark && styles.valueDark]}>{selectedUser.user_email}</Text>
                </View>
                
                <View style={styles.modalSection}>
                  <Text style={[styles.label, isDark && styles.labelDark]}>Role</Text>
                  <View style={styles.roleButtons}>
                    <Button 
                      size="sm" 
                      variant={selectedUser.user_role === 'user' ? 'default' : 'outline'}
                      onPress={() => handleChangeRole(selectedUser.user_id, 'user')}
                    >
                      User
                    </Button>
                    <Button 
                      size="sm" 
                      variant={selectedUser.user_role === 'admin' ? 'default' : 'outline'}
                      onPress={() => handleChangeRole(selectedUser.user_id, 'admin')}
                    >
                      Admin
                    </Button>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Button danger onPress={() => handleDeleteUser(selectedUser.user_id)}>
                    Delete User
                  </Button>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  containerDark: {
    backgroundColor: '#09090b',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  section: {
    marginTop: 8,
  },

  // Typography
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#18181b',
    letterSpacing: -0.5,
  },
  headingDark: {
    color: '#fafafa',
  },
  textMuted: {
    fontSize: 14,
    color: '#71717a',
  },
  textMutedDark: {
    color: '#a1a1aa',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18181b',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  sectionTitleDark: {
    color: '#fafafa',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  // Icon Container
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#f4f4f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerDark: {
    backgroundColor: '#27272a',
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  cardDark: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
  },

  // Badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Button
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  buttonDefault: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonSm: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextSm: {
    fontSize: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 40,
  },
  inputContainerDark: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#18181b',
    padding: 0,
  },
  inputDark: {
    color: '#fafafa',
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: '#e4e4e7',
    marginVertical: 12,
  },
  separatorDark: {
    backgroundColor: '#27272a',
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#18181b',
  },
  tabActiveDark: {
    backgroundColor: '#27272a',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717a',
  },
  tabTextDark: {
    color: '#a1a1aa',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabTextActiveDark: {
    color: '#fafafa',
  },

  // Stats
  statsGrid: {
    gap: 12,
  },
  fullWidthCard: {
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statLabelDark: {
    color: '#a1a1aa',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#18181b',
    letterSpacing: -0.5,
  },
  statValueLarge: {
    fontSize: 32,
    fontWeight: '700',
    color: '#18181b',
    letterSpacing: -0.5,
  },
  statValueDark: {
    color: '#fafafa',
  },

  // User Row Compact
  userRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#18181b',
  },
  userNameDark: {
    color: '#fafafa',
  },
  userEmail: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  userEmailDark: {
    color: '#a1a1aa',
  },

  // User Row Full
  userRowFull: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  userInfoFull: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userMain: {
    flex: 1,
  },
  userMetaRow: {
    alignItems: 'flex-end',
    gap: 6,
  },
  userDate: {
    fontSize: 12,
    color: '#71717a',
  },
  userDateDark: {
    color: '#a1a1aa',
  },

  // Transaction Row
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  transactionMain: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: '#18181b',
  },
  transactionDescDark: {
    color: '#fafafa',
  },
  transactionMeta: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  transactionMetaDark: {
    color: '#a1a1aa',
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  incomeText: {
    color: '#16a34a',
  },
  expenseText: {
    color: '#dc2626',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalContentDark: {
    backgroundColor: '#18181b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#18181b',
  },
  modalTitleDark: {
    color: '#fafafa',
  },
  modalSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717a',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelDark: {
    color: '#a1a1aa',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#18181b',
  },
  valueDark: {
    color: '#fafafa',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modalActions: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
  },

  // Audit Log Row
  auditRow: {
    paddingVertical: 12,
  },
  auditMain: {
    gap: 8,
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  auditTable: {
    fontSize: 14,
    fontWeight: '500',
    color: '#18181b',
  },
  auditTableDark: {
    color: '#fafafa',
  },
  auditMeta: {
    fontSize: 12,
    color: '#71717a',
  },
  auditMetaDark: {
    color: '#a1a1aa',
  },
});
