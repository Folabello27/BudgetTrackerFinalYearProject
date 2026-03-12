import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import type { FlatList } from 'react-native';
import {
  ImageSourcePropType,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewToken,
} from 'react-native';
import Animated, {
  Extrapolate,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { STORAGE_KEYS } from '@/constants/storage';

type Slide = {
  id: string;
  title: string;
  description: string;
  image: ImageSourcePropType;
};

const SLIDES: Slide[] = [
  {
    id: '1',
    title: 'Stop guessing where your money goes.',
    description: 'Track spending, spot subscriptions, and grow your "Safe-to-Spend" balance.',
    image: require('@/assets/images/onboarding images/image 12.png'),
  },
  {
    id: '2',
    title: 'Budget by your week, not just by month.',
    description: 'Create micro-budgets that adapt to weekdays, weekends, or paydays to enhance your cash flow.',
    image: require('@/assets/images/onboarding images/image 13.png'),
  },
  {
    id: '3',
    title: 'See how your feelings shape your finances.',
    description: 'Tag your check-ins with your mood to uncover patterns like "stress Thursdays" and create sustainable budgets.',
    image: require('@/assets/images/onboarding images/image 14.png'),
  },
];

const PaginationDot = ({ index, scrollX, width }: { index: number; scrollX: Animated.SharedValue<number>; width: number }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const dotWidth = interpolate(
      scrollX.value,
      inputRange,
      [8, 20, 8],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolate.CLAMP
    );

    const backgroundColor = interpolate( // This won't work perfectly for colors in reanimated 2/3 without processColor or similar sometimes, but let's try strict condition or style update
      scrollX.value,
      inputRange,
      [0, 1, 0], // Logic placeholder
    );

    return {
      width: dotWidth,
      opacity,
      backgroundColor: index === Math.round(scrollX.value / width) ? '#C1F232' : '#E0E0E0', // Simplified logic for color
    };
  });

  // Re-implementing color interpolation properly
  const animatedColorStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    // We can't easily interpolate colors in this simple way without setup, so we'll rely on opacity/width mostly
    // But let's try a different approach for the active dot color:
    // Actually, let's just use opacity for now, or just condition on index vs logical index
    // A better way is to render all dots and animate their scale/width.

    // For specific active color vs inactive color:
    // It's tricky with scroll interpolation for colors directly without internal numeric conversion.
    // Let's stick to a simple varying width/opacity style.
    // But the user design shows GREEN active dot, GREY inactive.

    return {
      width: interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolate.CLAMP),
      backgroundColor: interpolate(
        scrollX.value,
        inputRange,
        [0, 1, 0],
        Extrapolate.CLAMP
      ) > 0.5 ? '#B1E918' : '#E5E5E5', // Crude threshold; adequate for simple dots
    };
  });

  return <Animated.View style={[styles.dot, animatedColorStyle]} />;
};

const SlideItem = ({ item, index, scrollX, width, height }: { item: Slide; index: number; scrollX: Animated.SharedValue<number>; width: number; height: number }) => {
  const imageStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    // Simple fade
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolate.CLAMP
    );
    // Scale effect
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1, 0.8],
      Extrapolate.CLAMP
    );
    return {
      opacity,
      transform: [{ scale }]
    };
  });

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 80 }}>
      {/* Image Section */}
      <Animated.View style={[{ width: width * 0.9, height: height * 0.35, justifyContent: 'center', alignItems: 'center' }, imageStyle]}>
        <Animated.Image
          source={item.image}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Text Section */}
      <View style={styles.textContainer}>
        <Animated.Text entering={FadeInDown.delay(100).duration(600)} style={styles.title}>
          {item.title}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(600)} style={styles.description}>
          {item.description}
        </Animated.Text>
      </View>
    </View>
  );
};

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => { scrollX.value = event.contentOffset.x; },
  });

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const handleCompletion = useCallback(async (route: string) => {
    await AsyncStorage.setItem(STORAGE_KEYS.hasSeenOnboarding, 'true');
    router.replace(route as any);
  }, []);

  const handleNext = async () => {
    if (currentIndex === SLIDES.length - 1) {
      await handleCompletion('/(auth)/signup');
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const handleSkip = () => handleCompletion('/(auth)/signup');
  const handleLogin = () => handleCompletion('/(auth)/login');

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header Skip Button */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={({ item, index }) => (
          <SlideItem item={item} index={index} scrollX={scrollX} width={width} height={height} />
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        scrollEventThrottle={16}
        bounces={false}
      />

      {/* Footer Section */}
      <View style={[styles.footer, { paddingBottom: Platform.OS === 'ios' ? 0 : 24 }]}>
        {/* Pagination Dots */}
        <View style={styles.paginationContainer}>
          {SLIDES.map((_, index) => (
            <PaginationDot key={index.toString()} index={index} scrollX={scrollX} width={width} />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}
            onPress={handleNext}
          >
            <Text style={styles.primaryButtonText}>
              {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
          </Pressable>

          <Pressable onPress={handleLogin} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>
              I already have an account <Text style={{ fontWeight: '800' }}>Sign In</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F7F7F7', // Light grey pill
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  textContainer: {
    paddingHorizontal: 32,
    marginTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800', // Extra bold
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#1A1A1A',
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#C1F232',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '600',
  },
});
