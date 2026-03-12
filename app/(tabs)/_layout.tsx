import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

const TabIcon = ({ name, color, focused }: { name: any, color: string, focused: boolean }) => {
  const scale = useRef(new Animated.Value(focused ? 1.2 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.2 : 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons size={24} name={focused ? name : `${name}-outline`} color={color} />
    </Animated.View>
  );
};

const ScalePressable = ({ children, onPress, style }: { children: React.ReactNode, onPress?: () => void, style?: any }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.9, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function TabLayout() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? '#FFFFFF' : '#1A1A1A',
        tabBarInactiveTintColor: isDark ? '#666666' : '#9E9E9E',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#0F0F12' : '#FFFFFF',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 100 : 80,
          paddingBottom: Platform.OS === 'ios' ? 36 : 16,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
          paddingBottom: 4,
        },
      }}>

      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="insights"
        options={{
          title: 'Report',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="pie-chart" color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={styles.fabContainer}>
              <LinearGradient
                colors={['#FFD54F', '#000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fabGradient}
              >
                <Ionicons name="add" size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
          ),
          tabBarButton: (props) => (
            <ScalePressable
              {...(props as any)}
              style={styles.fabButton}
              onPress={() => {
                router.push('/new-transaction');
              }}
            >
              {props.children}
            </ScalePressable>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/new-transaction');
          },
        }}
      />

      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="wallet" color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person" color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="transactions"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  }
});
