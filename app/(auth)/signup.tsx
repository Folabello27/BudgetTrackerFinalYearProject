import { setSessionFromOAuthRedirect, supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

type FocusOption = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  lightColor: string;
};

const FOCUS_OPTIONS: FocusOption[] = [
  {
    id: 'save_money',
    label: 'Save Money',
    icon: 'wallet-outline',
    color: '#FFD54F', // Yellow
    lightColor: '#FFF8E1',
  },
  {
    id: 'track_spending',
    label: 'Track Spending',
    icon: 'bar-chart-outline',
    color: '#E1BEE7', // Purple/Lavender
    lightColor: '#F3E5F5',
  },
  {
    id: 'invest',
    label: 'Invest',
    icon: 'trending-up-outline',
    color: '#FFCDD2', // Pink
    lightColor: '#FFEBEE',
  },
];

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [primaryFocus, setPrimaryFocus] = useState<string>('save_money');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success' | null, message: string | null }>({ type: null, message: null });

  async function handleSignup() {
    setStatus({ type: null, message: null });
    if (!email || !password || !fullName) {
      setStatus({ type: 'error', message: 'Please fill in all fields' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            primary_focus: primaryFocus,
          },
        },
      });

      if (error) throw error;

      setStatus({ type: 'success', message: 'Account created! Please check your email to verify.' });
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 3000);
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      const redirectTo = Constants.appOwnership === 'expo'
        ? AuthSession.makeRedirectUri({ useProxy: true })
        : Linking.createURL('auth-callback', { scheme: 'budgettracker' });
      console.log('Google OAuth redirect URI:', redirectTo);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        const callbackUrl = result.type === 'success' && 'url' in result ? result.url : await Linking.getInitialURL();
        if (callbackUrl) {
          console.log('Google auth callback URL:', callbackUrl);
          await setSessionFromOAuthRedirect(callbackUrl);
          router.replace('/(tabs)');
          return;
        }
        throw new Error(`Google sign-in failed: ${result.type}`);
      } else {
        throw new Error('Unable to start Google sign-in flow.');
      }
    } catch (error: any) {
      setStatus({ type: 'error', message: `Google Sign-In: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <View style={styles.brandChip}>
              <Ionicons name="sparkles-outline" size={18} color="#1A1A1A" />
              <Text style={styles.brandText}>Build your money plan</Text>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Set up your account and start turning everyday spending into clear, intentional progress.
            </Text>
          </View>

          {/* Primary Focus Section */}
          <Text style={styles.sectionLabel}>What's your primary focus?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.focusContainer}
          >
            {FOCUS_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => setPrimaryFocus(option.id)}
                style={[
                  styles.focusCard,
                  { backgroundColor: option.color },
                  primaryFocus === option.id && styles.focusCardSelected,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: option.lightColor }]}>
                    <Ionicons name={option.icon} size={20} color="#1A1A1A" />
                  </View>
                  {primaryFocus === option.id && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={24} color="#1A1A1A" />
                    </View>
                  )}
                </View>
                <Text style={styles.focusLabel}>{option.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Form Fields */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (status.message) setStatus({ type: null, message: null });
                }}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (status.message) setStatus({ type: null, message: null });
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (status.message) setStatus({ type: null, message: null });
                }}
                secureTextEntry={!showPassword}
                placeholderTextColor="#999"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
              </Pressable>
            </View>

            {status.message && (
              <View style={[
                styles.statusContainer,
                status.type === 'error' ? styles.errorContainer : styles.successContainer
              ]}>
                <Ionicons
                  name={status.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
                  size={20}
                  color={status.type === 'error' ? '#EF4444' : '#10B981'}
                />
                <Text style={[
                  styles.statusText,
                  status.type === 'error' ? styles.errorText : styles.successText
                ]}>
                  {status.message}
                </Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && { opacity: 0.9 },
                loading && { opacity: 0.7 }
              ]}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Creating Account...' : 'Create Account'}</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Logins */}
          <View style={styles.socialContainer}>
            <Pressable style={styles.socialButton} onPress={handleGoogleSignIn} disabled={loading}>
              <Ionicons name="logo-google" size={24} color="#EA4335" />
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Log In</Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20, // Reduced from 40
    paddingBottom: 20, // Reduced from 40
  },
  header: {
    marginBottom: 20, // Reduced from 32
  },
  brandChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EDE9FE',
    marginBottom: 16,
  },
  brandText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },
  title: {
    fontSize: 24, // Reduced from 28
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8, // Reduced from 12
  },
  subtitle: {
    fontSize: 14, // Reduced from 16
    color: '#666',
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12, // Reduced from 16
  },
  focusContainer: {
    gap: 12, // Reduced from 16
    paddingRight: 24,
    marginBottom: 20, // Reduced from 32
  },
  focusCard: {
    width: 120, // Reduced from 140
    height: 140, // Reduced from 160
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  focusCardSelected: {
    borderColor: '#1A1A1A',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 36, // Reduced from 40
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    // Checkmark style
  },
  focusLabel: {
    fontSize: 14, // Reduced from 16
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 20,
  },
  form: {
    gap: 12, // Reduced from 16
    marginBottom: 20, // Reduced from 32
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48, // Reduced from 56
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
  },
  button: {
    backgroundColor: '#1A1A1A',
    height: 48, // Reduced from 56
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#C1F232',
    fontSize: 15,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20, // Reduced from 32
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#9CA3AF',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24, // Reduced from 40
  },
  socialButton: {
    width: 48, // Reduced from 56
    height: 48, // Reduced from 56
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  successContainer: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  errorText: {
    color: '#991B1B',
  },
  successText: {
    color: '#065F46',
  },
});