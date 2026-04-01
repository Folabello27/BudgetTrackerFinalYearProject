import { IslandProvider } from '@/components/ui/island-context';
import { Colors } from '@/constants/theme';
import { CurrencyProvider } from '@/lib/currency-context';
import { NotificationService } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/lib/theme-context';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    NotificationService.requestPermissions();

    // Listen for notification responses (when user taps on it)
    const subscription = Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
      const url = response.notification.request.content.data.url;
      if (url) router.push(url);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event !== 'PASSWORD_RECOVERY') {
        router.replace('/(tabs)');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const customTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: Colors[theme].tint,
      background: Colors[theme].background,
      card: isDark ? '#0F0F12' : '#FFFFFF',
      border: isDark ? '#1E1E2A' : '#F0F0F0',
      text: Colors[theme].text,
    },
  };

  return (
    <ThemeProvider value={customTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="new-transaction"
          options={{
            presentation: 'modal',
            headerShown: false
          }}
        />
        <Stack.Screen name="subscriptions" options={{ headerShown: false }} />
        <Stack.Screen name="subscription-details" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <CurrencyProvider>
        <IslandProvider>
          <RootLayoutContent />
        </IslandProvider>
      </CurrencyProvider>
    </AppThemeProvider>
  );
}
