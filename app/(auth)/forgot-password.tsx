import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
  View,
} from 'react-native';

type ResetStep = 'email' | 'otp' | 'new_password';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success' | null, message: string | null }>({ type: null, message: null });

  // Timer for OTP resend
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async () => {
    setStatus({ type: null, message: null });
    if (!email) {
      setStatus({ type: 'error', message: 'Please enter your email address' });
      return;
    }

    setLoading(true);
    try {
      // Supabase: If your project is configured for OTP recovery, this sends the code.
      // If links are enabled, it sends a link. 
      // Most developers configure Supabase to send a 6-digit code for seamless "in-app" flows.
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      setStep('otp');
      setResendTimer(60);
      setStatus({ type: 'success', message: 'OTP code sent to your email.' });
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setStatus({ type: null, message: null });
    if (otp.length < 6) {
      setStatus({ type: 'error', message: 'Please enter the verification code' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery',
      });
      if (error) throw error;

      setStep('new_password');
      setStatus({ type: 'success', message: 'Code verified! Set your new password.' });
    } catch (error: any) {
      setStatus({ type: 'error', message: 'Invalid code. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    setStatus({ type: null, message: null });
    if (!newPassword || newPassword.length < 6) {
      setStatus({ type: 'error', message: 'Password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setStatus({ type: 'success', message: 'Password updated successfully!' });
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2000);
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setOtp('');
    handleSendOtp();
  };

  const goBackStep = () => {
    if (step === 'otp') setStep('email');
    else if (step === 'new_password') setStep('otp');
    else router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <Pressable onPress={goBackStep} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>
              {step === 'email' ? 'Forgot Password' : step === 'otp' ? 'Check Email' : 'New Password'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? "Enter your email address and we'll send you an OTP code to reset your password."
                : step === 'otp'
                  ? `We've sent a 6-digit verification code to ${email}`
                  : "Create a strong new password to secure your account."}
            </Text>
          </View>

          <View style={styles.form}>
            {step === 'email' && (
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
            )}

            {step === 'otp' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <View style={[styles.inputContainer, { justifyContent: 'center' }]}>
                  <TextInput
                    style={[styles.input, { textAlign: 'center', letterSpacing: 6, fontSize: 20, fontWeight: '700' }]}
                    placeholder="00000000"
                    value={otp}
                    onChangeText={(text) => {
                      setOtp(text.replace(/[^0-9]/g, '').slice(0, 8));
                      if (status.message) setStatus({ type: null, message: null });
                    }}
                    keyboardType="number-pad"
                    placeholderTextColor="#999"
                  />
                </View>
                <Pressable onPress={handleResendOtp} disabled={resendTimer > 0}>
                  <Text style={[styles.resendText, resendTimer > 0 && { opacity: 0.5 }]}>
                    {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}
                  </Text>
                </Pressable>
              </View>
            )}

            {step === 'new_password' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••••••"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              </>
            )}

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
              onPress={
                step === 'email' ? handleSendOtp : step === 'otp' ? handleVerifyOtp : handleUpdatePassword
              }
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Processing...' : step === 'email' ? 'Send OTP' : step === 'otp' ? 'Verify Code' : 'Update Password'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  header: {
    marginBottom: 40,
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
    marginBottom: 24,
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
  resendText: {
    marginTop: 12,
    color: '#FFD54F',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#FFD54F', // Yellow
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD54F',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  buttonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFD54F', // Yellow
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
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
