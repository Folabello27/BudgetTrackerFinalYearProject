import { BiometricService } from '@/lib/biometrics';
import { setSessionFromOAuthRedirect, supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometrics');
  const [status, setStatus] = useState<{ type: 'error' | 'success' | null, message: string | null }>({ type: null, message: null });

  useEffect(() => {
    checkBiometrics();
  }, []);

  async function checkBiometrics() {
    const supported = await BiometricService.isSupported();
    const enabled = await BiometricService.isBiometricEnabled();
    if (supported && enabled) {
      setIsBiometricAvailable(true);
      const type = await BiometricService.getBiometricType();
      setBiometricType(type);

      // Optionally auto-prompt
      setTimeout(() => {
        handleBiometricLogin();
      }, 500);
    }
  }

  async function handleBiometricLogin() {
    const success = await BiometricService.authenticate();
    if (success) {
      const creds = await BiometricService.getCredentials();
      if (creds) {
        setLoading(true);
        try {
          const { error } = await supabase.auth.signInWithPassword({
            email: creds.email,
            password: creds.pass,
          });
          if (error) throw error;
          router.replace('/(tabs)');
        } catch (error: any) {
          setStatus({ type: 'error', message: 'Biometric login failed. Please use your password.' });
        } finally {
          setLoading(false);
        }
      } else {
        setStatus({ type: 'error', message: 'Biometrics not set up. Please sign in with password first.' });
      }
    }
  }

  async function handleLogin() {
    setStatus({ type: null, message: null });
    if (!email || !password) {
      setStatus({ type: 'error', message: 'Please fill in all fields' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      await BiometricService.saveCredentials(email, password);

      router.replace('/(tabs)');
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
              <Ionicons name="wallet-outline" size={18} color="#1A1A1A" />
              <Text style={styles.brandText}>Budget Tracker</Text>
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to review your spending, goals, and financial habits in one place.
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="hello@example.com"
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
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••••••"
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
            </View>

            <View style={styles.forgotContainer}>
              <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
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
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Logging In...' : 'Log In'}</Text>
            </Pressable>

            {isBiometricAvailable && (
              <Pressable
                onPress={handleBiometricLogin}
                style={[styles.biometricButton, { marginTop: 16 }]}
              >
                <Ionicons
                  name={biometricType === 'FaceID' ? 'scan-outline' : 'finger-print-outline'}
                  size={24}
                  color="#1A1A1A"
                />
                <Text style={styles.biometricText}>Sign in with {biometricType}</Text>
              </Pressable>
            )}
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
              <Ionicons name="logo-google" size={22} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.socialButtonText}>Google</Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
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
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  form: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: '#1A1A1A',
    fontWeight: '700',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#7C3AED',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#9CA3AF',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 60,
  },
  socialButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  signupLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  biometricText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
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
    fontSize: 14,
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