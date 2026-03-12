import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

type AuthScreenProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthScreen({ title, subtitle, children, footer }: AuthScreenProps) {
  return (
    <LinearGradient colors={['#050505', '#050505']} style={styles.gradient}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}>
            <View style={styles.brandPill}>
              <View style={styles.pillDot} />
              <Text style={styles.pillLabel}>BudgetTracker</Text>
            </View>

            <View style={styles.hero}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <View style={styles.formContainer}>{children}</View>
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  brandPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D0D15',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1E1E2A',
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#7DFFB3',
  },
  pillLabel: {
    color: '#E5E7EF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  hero: {
    marginTop: 26,
    gap: 12,
  },
  title: {
    fontSize: 32,
    color: '#F5F7FB',
    fontWeight: '700',
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#9AA0B3',
    lineHeight: 22,
  },
  formContainer: {
    marginTop: 32,
    gap: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#1E1E2A',
    backgroundColor: '#050505',
  },
});


