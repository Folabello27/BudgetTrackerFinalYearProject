import { CurrencySelector } from '@/components/currency-selector';
import { Colors } from '@/constants/Colors';
import { useCurrency } from '@/hooks/use-currency';
import { BiometricService } from '@/lib/biometrics';
import { getReleaseHighlights } from '@/lib/release-notes';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const PERSONALITIES = {
  strategic_saver: {
    title: "Strategic Saver",
    description: "You're in the top 5% of planners!",
    icon: "star" as any,
    color: "#FFD54F"
  },
  mindful_spender: {
    title: "Mindful Spender",
    description: "Great job staying within your limits.",
    icon: "leaf-outline" as any,
    color: "#81C784"
  },
  balanced_planner: {
    title: "Balanced Planner",
    description: "You've got a great handle on your flow.",
    icon: "scale-outline" as any,
    color: "#64B5F6"
  },
  high_flyer: {
    title: "High Flyer",
    description: "Active spending, keep an eye on goals.",
    icon: "rocket-outline" as any,
    color: "#BA68C8"
  },
  fresh_starter: {
    title: "Fresh Starter",
    description: "Start tracking to find your persona.",
    icon: "book-outline" as any,
    color: "#9E9E9E"
  }
};

export default function ProfileScreen() {
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const isDark = theme === 'dark';
  const colors = Colors[theme];

  const [avatar, setAvatar] = useState<string | null>(null);
  const [fullName, setFullName] = useState('User');
  const [email, setEmail] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [personality, setPersonality] = useState(PERSONALITIES.strategic_saver);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometrics');
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const releaseHighlights = getReleaseHighlights('2.5.0');

  // Modals
  const [isAccountModalVisible, setIsAccountModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const savedAvatar = await AsyncStorage.getItem('userAvatar');
      if (savedAvatar) setAvatar(savedAvatar);

      const { data: { user } } = await supabase.auth.getUser();
      let userId: string | null = null;

      if (user) {
        userId = user.id;
        setEmail(user.email || '');
        if (user.user_metadata?.full_name) {
          setFullName(user.user_metadata.full_name);
          setEditName(user.user_metadata.full_name);
        }

        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        setIsAdmin(profile?.role === 'admin');
      }

      const notifyPref = await AsyncStorage.getItem('notificationsEnabled');
      if (notifyPref !== null) setNotificationsEnabled(notifyPref === 'true');

      try {
        const supported = await BiometricService.isSupported();
        setIsBiometricSupported(supported);
        if (supported) {
          const enabled = await BiometricService.isBiometricEnabled();
          setBiometricEnabled(enabled);
          const type = await BiometricService.getBiometricType();
          setBiometricType(type);
        }
      } catch (bioError) {
        console.log('Biometric check failed:', bioError);
        // Fallback for development/certain environments
        if (__DEV__) setIsBiometricSupported(true);
      }

      // Calculate Personality
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: monthTx } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'expense')
        .gte('date', startOfMonth);

      const prof = userId
        ? await supabase
            .from('profiles')
            .select('monthly_budget')
            .eq('id', userId)
            .single()
        : { data: null };

      const spent = monthTx?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const budget = prof?.data?.monthly_budget || 3000;
      const ratio = spent / budget;

      if (!monthTx || monthTx.length === 0) setPersonality(PERSONALITIES.fresh_starter);
      else if (ratio < 0.35) setPersonality(PERSONALITIES.strategic_saver);
      else if (ratio < 0.65) setPersonality(PERSONALITIES.mindful_spender);
      else if (ratio < 0.9) setPersonality(PERSONALITIES.balanced_planner);
      else setPersonality(PERSONALITIES.high_flyer);
    } catch (error) {
      console.log('Error loading profile:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateAccount = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: editName.trim() }
      });

      if (error) throw error;

      setFullName(editName.trim());
      setIsAccountModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile();
  }, []);

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
      await AsyncStorage.setItem('userAvatar', uri);
    }
  };

  const toggleNotifications = async () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    await AsyncStorage.setItem('notificationsEnabled', newValue.toString());
  };

  const toggleBiometrics = async () => {
    const newValue = !biometricEnabled;

    if (newValue) {
      const enrolled = await BiometricService.isEnrolled();
      if (!enrolled) {
        Alert.alert(
          'Biometrics Not Setup',
          `Please set up ${biometricType} in your device settings first.`,
          [{ text: 'OK' }]
        );
        return;
      }

      const success = await BiometricService.authenticate();
      if (!success) return;
    }

    setBiometricEnabled(newValue);
    await BiometricService.setBiometricEnabled(newValue);

    if (newValue) {
      Alert.alert(
        'Biometrics Enabled',
        `You can now use ${biometricType} to sign in. Please log in with your password once more to securely save your credentials.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/onboarding');
          }
        }
      ]
    );
  };

  const handleSupport = () => {
    Alert.alert(
      "Support",
      "Need help? Contact us at support@financeapp.com or visit our help center.",
      [{ text: "OK" }]
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      "Privacy Policy",
      "Your data is encrypted and never shared with third parties. View our full privacy policy at financeapp.com/privacy.",
      [{ text: "OK" }]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
          <Text style={[styles.headerTitle, isDark && styles.textWhite]}>Profile</Text>
          <Pressable onPress={() => router.push('/notifications')} style={[styles.bellButton, isDark && styles.bellButtonDark]}>
            <Ionicons name="notifications-outline" size={24} color={isDark ? "#A78BFA" : "#7C3AED"} />
            <View style={styles.bellBadge} />
          </Pressable>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, isDark && styles.cardDark]}>
          <Pressable onPress={pickImage} style={styles.avatarContainer}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={isDark ? "#444" : "#CCC"} />
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={10} color="#FFF" />
            </View>
          </Pressable>
          <Text style={[styles.userName, isDark && styles.textWhite]}>{fullName}</Text>
          <Text style={[styles.userEmail, isDark && styles.userEmailDark]}>{email}</Text>
        </View>

        {/* Personality Card */}
        <View style={[styles.personalityCard, isDark && styles.personalityCardDark]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.personalityLabel}>YOUR MONEY PERSONALITY</Text>
            <Text style={[styles.personalityTitle, { color: personality.color }]}>{personality.title}</Text>
            <Text style={styles.personalityDesc}>{personality.description}</Text>
          </View>
          <View style={styles.personalityIcon}>
            <Ionicons name={personality.icon} size={24} color={personality.color} />
          </View>
        </View>

        <View style={[styles.projectCard, isDark && styles.cardDark]}>
          <View style={styles.projectHeader}>
            <Text style={styles.projectBadge}>NEW</Text>
            <Text style={[styles.projectVersion, isDark && styles.textWhite]}>v2.5.0</Text>
          </View>
          <Text style={[styles.projectTitle, isDark && styles.textWhite]}>{releaseHighlights.title}</Text>
          <Text style={[styles.projectSummary, isDark && styles.projectSummaryDark]}>{releaseHighlights.summary}</Text>
          {releaseHighlights.highlights.slice(0, 3).map((item) => (
            <View key={item} style={styles.projectPointRow}>
              <Ionicons name="sparkles-outline" size={14} color={isDark ? '#FFD54F' : '#1A1A1A'} />
              <Text style={[styles.projectPoint, isDark && styles.textWhite]}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Settings Groups */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={[styles.menuContainer, isDark && styles.cardDark]}>
            <MenuLink
              icon="person-outline"
              label="Account Information"
              onPress={() => setIsAccountModalVisible(true)}
              isDark={isDark}
            />
            <View style={[styles.divider, isDark && styles.dividerDark]} />
            <MenuLink
              icon="wallet-outline"
              label="Savings Goals"
              onPress={() => router.push('/savings-goals')}
              isDark={isDark}
            />
            <View style={[styles.divider, isDark && styles.dividerDark]} />
            <MenuLink
              icon="analytics-outline"
              label="Smart Insights"
              onPress={() => router.push('/smart-insights')}
              isDark={isDark}
            />
            {isAdmin && (
              <>
                <View style={[styles.divider, isDark && styles.dividerDark]} />
                <MenuLink
                  icon="briefcase-outline"
                  label="Admin Dashboard"
                  onPress={() => router.push('/admin')}
                  isDark={isDark}
                />
              </>
            )}
            <View style={[styles.divider, isDark && styles.dividerDark]} />
            <MenuLink
              icon="notifications-outline"
              label="Notifications"
              isDark={isDark}
              rightContent={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={toggleNotifications}
                  trackColor={{ false: colors.border, true: '#7C3AED' }}
                  thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (notificationsEnabled ? '#7C3AED' : '#f4f3f4')}
                />
              }
            />
            <View style={[styles.divider, isDark && styles.dividerDark]} />
            <MenuLink
              icon="color-palette-outline"
              label="Dark Mode"
              isDark={isDark}
              rightContent={
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.border, true: '#7C3AED' }}
                  thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (isDark ? '#A78BFA' : '#7C3AED')}
                />
              }
            />
          </View>

          <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark, { marginTop: 20 }]}>About</Text>

          <View style={[styles.menuContainer, isDark && styles.cardDark]}>
            <MenuLink
              icon="help-circle-outline"
              label="Support"
              onPress={handleSupport}
              isDark={isDark}
            />
            <View style={[styles.divider, isDark && styles.dividerDark]} />
            <MenuLink
              icon="shield-checkmark-outline"
              label="Privacy"
              onPress={handlePrivacy}
              isDark={isDark}
            />
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Preferences</Text>

          <View style={[styles.menuContainer, isDark && styles.cardDark]}>
            <CurrencySelector value={currency} onChange={setCurrency} />
          </View>

          {isBiometricSupported && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Security</Text>
              <View style={[styles.menuContainer, isDark && styles.cardDark]}>
                <MenuLink
                  icon={biometricType === 'FaceID' ? "scan-outline" : "finger-print-outline"}
                  label={`Login with ${biometricType}`}
                  isDark={isDark}
                  rightContent={
                    <Switch
                      value={biometricEnabled}
                      onValueChange={toggleBiometrics}
                      trackColor={{ false: colors.border, true: '#7C3AED' }}
                      thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (biometricEnabled ? '#7C3AED' : '#f4f3f4')}
                    />
                  }
                />
              </View>
            </>
          )}
        </View>

        {/* Log Out */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={[styles.logoutButton, isDark && styles.logoutButtonDark]}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 2.5.0</Text>
      </ScrollView>

      {/* Account Info Modal */}
      <Modal
        visible={isAccountModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAccountModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.modalContent, isDark && styles.modalContentDark]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.textWhite]}>Edit Profile</Text>
              <Pressable onPress={() => setIsAccountModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? "#FFF" : "#1A1A1A"} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor="#9E9E9E"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={[styles.input, styles.disabledInput, isDark && { backgroundColor: '#222', borderColor: '#333', color: '#9E9E9E' }]}
                value={email}
                editable={false}
              />
              <Text style={styles.helperText}>Email cannot be changed here.</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, isDark && styles.saveBtnDark]}
              onPress={handleUpdateAccount}
              disabled={loading}
            >
              <Text style={[styles.saveBtnText, isDark && styles.textBlack]}>{loading ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView >
  );
}

const MenuLink = ({ icon, label, onPress, isDark, rightContent }: any) => (
  <Pressable
    style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
    onPress={onPress}
  >
    <View style={styles.menuLeft}>
      <View style={[styles.iconBox, isDark && styles.iconBoxDark]}>
        <Ionicons name={icon} size={18} color={isDark ? "#FFF" : "#1A1A1A"} />
      </View>
      <Text style={[styles.menuLabel, isDark && styles.textWhite]}>{label}</Text>
    </View>
    <View style={styles.menuRight}>
      {rightContent ? rightContent : (
        <Ionicons name="chevron-forward" size={16} color="#9E9E9E" />
      )}
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  safeAreaDark: {
    backgroundColor: '#0F0F12',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textBlack: {
    color: '#000000',
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  bellButtonDark: {
    backgroundColor: '#1A1A1A',
    borderColor: '#333',
  },
  bellBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#1A1A1A',
    borderColor: '#333',
  },
  avatarContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  userEmail: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 2,
  },
  userEmailDark: {
    color: '#D1D5DB',
  },
  personalityCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  personalityCardDark: {
    backgroundColor: '#222',
  },
  personalityLabel: {
    color: '#9E9E9E',
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 1,
  },
  personalityLabelDark: {
    color: '#D1D5DB',
  },
  personalityTitle: {
    color: '#FFD54F',
    fontSize: 16,
    fontWeight: '700',
  },
  personalityDesc: {
    color: '#D1D1D6',
    fontSize: 12,
  },
  personalityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  projectBadge: {
    backgroundColor: '#FFD54F',
    color: '#1A1A1A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
  },
  projectVersion: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9E9E9E',
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  projectSummary: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
    lineHeight: 18,
  },
  projectSummaryDark: {
    color: '#D1D5DB',
  },
  projectPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  projectPoint: {
    flex: 1,
    fontSize: 13,
    color: '#1A1A1A',
  },
  settingsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9E9E9E',
    marginLeft: 4,
  },
  sectionTitleDark: {
    color: '#D1D5DB',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
  },
  pressed: {
    backgroundColor: '#F9F9F9',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxDark: {
    backgroundColor: '#333',
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  menuRight: {},
  divider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 12,
  },
  dividerDark: {
    backgroundColor: '#333',
  },
  logoutButton: {
    backgroundColor: '#FFEBEE',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  logoutButtonDark: {
    backgroundColor: 'rgba(255,82,82,0.1)',
  },
  logoutText: {
    color: '#FF5252',
    fontSize: 15,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    color: '#9E9E9E',
    fontSize: 11,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 50 : 32, // Moved up a tiny bit
    gap: 20,
  },
  modalContentDark: {
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9E9E9E',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#000',
  },
  inputDark: {
    backgroundColor: '#222',
    borderColor: '#333',
    color: '#FFF',
  },
  disabledInput: {
    color: '#9E9E9E',
    backgroundColor: '#FAFAFA',
  },
  helperText: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  saveBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnDark: {
    backgroundColor: '#FFF',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  }
});