import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export type IslandType = 'success' | 'syncing' | 'error' | 'none';

interface DynamicIslandProps {
    type: IslandType;
    message: string;
}

export function DynamicIsland({ type, message }: DynamicIslandProps) {
    const expanded = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (type !== 'none') {
            // Animation Sequence: Expand -> Wait -> Contract
            opacity.value = withSpring(1);
            expanded.value = withSequence(
                withSpring(1, { damping: 15, stiffness: 100 }),
                withDelay(2500, withSpring(0, { damping: 15, stiffness: 100 }))
            );
        } else {
            opacity.value = withSpring(0);
        }
    }, [type]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            width: interpolate(expanded.value, [0, 1], [120, width * 0.9]),
            height: interpolate(expanded.value, [0, 1], [30, 60]),
            borderRadius: 30,
            opacity: opacity.value,
            transform: [
                { translateY: interpolate(expanded.value, [0, 1], [10, 20]) },
                { scale: interpolate(expanded.value, [0, 1], [0.8, 1]) },
            ],
        };
    });

    const contentStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(expanded.value, [0.8, 1], [0, 1]),
        };
    });

    if (type === 'none') return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return 'checkmark-circle';
            case 'syncing': return 'sync';
            case 'error': return 'alert-circle';
            default: return 'notifications';
        }
    };

    const getColor = () => {
        switch (type) {
            case 'success': return '#7DFFB3';
            case 'error': return '#FF8A8A';
            default: return '#FFD54F';
        }
    };

    return (
        <View style={styles.container} pointerEvents="none">
            <Animated.View style={[styles.island, animatedStyle]}>
                <Animated.View style={[styles.content, contentStyle]}>
                    <View style={[styles.iconCircle, { backgroundColor: getColor() + '20' }]}>
                        <Ionicons name={getIcon()} size={20} color={getColor()} />
                    </View>
                    <Text style={styles.message} numberOfLines={1}>{message}</Text>
                </Animated.View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 40, // Adjust for iOS notch
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
    },
    island: {
        backgroundColor: '#000000',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#1E1E1E',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        width: '100%',
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    message: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
});
