import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { STORAGE_KEYS } from '@/constants/storage';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type AppState = 'loading' | 'onboarding' | 'auth' | 'app';

export default function Index() {
  const [state, setState] = useState<AppState>('loading');
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const value = await AsyncStorage.getItem(STORAGE_KEYS.hasSeenOnboarding);
        setHasSeenOnboarding(value === 'true');
      } catch (error) {
        console.error('Failed to read onboarding state', error);
        setHasSeenOnboarding(false);
      }
    })();
  }, []);

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
      setCheckingSession(false);
    };

    fetchSession();

    const { data } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
      setSession(updatedSession);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (hasSeenOnboarding === null || checkingSession) {
      setState('loading');
      return;
    }

    if (!hasSeenOnboarding) {
      setState('onboarding');
      return;
    }

    setState(session ? 'app' : 'auth');
  }, [hasSeenOnboarding, checkingSession, session]);

  if (state === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Colors.dark.background,
        }}>
        <ActivityIndicator size="large" color={Colors.dark.tint} />
      </View>
    );
  }

  if (state === 'onboarding') {
    return <Redirect href="/onboarding" />;
  }

  if (state === 'app') {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

