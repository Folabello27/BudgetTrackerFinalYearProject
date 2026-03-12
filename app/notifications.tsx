import { AppNotification, NotificationService } from '@/lib/notifications';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View
} from 'react-native';

const MOCK_NOTIFICATIONS: AppNotification[] = [
    {
        id: 'mock-1',
        title: 'Upcoming Bill',
        message: 'Your Netflix subscription ($15.99) is due tomorrow.',
        time: '2h ago',
        type: 'subscription',
        isRead: false,
        timestamp: Date.now() - 7200000, // 2h ago
    },
    {
        id: 'mock-2',
        title: 'Budget Alert',
        message: 'You have reached 80% of your daily budget.',
        time: '5h ago',
        type: 'alert',
        isRead: false,
        timestamp: Date.now() - 18000000, // 5h ago
    }
];

export default function NotificationsScreen() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        setLoading(true);
        const saved = await NotificationService.getNotifications();
        // Combine and sort by timestamp descending (newest first)
        const combined = [...saved, ...MOCK_NOTIFICATIONS].sort((a, b) => b.timestamp - a.timestamp);
        setNotifications(combined);
        setLoading(false);
    };

    const handleMarkAllRead = async () => {
        await NotificationService.markAllAsRead();
        loadNotifications();
    };

    const handleDelete = async (id: string) => {
        if (id.startsWith('mock-')) {
            // Just filter out mock ones locally for this session
            setNotifications(prev => prev.filter(n => n.id !== id));
            return;
        }
        await NotificationService.deleteNotification(id);
        loadNotifications();
    };

    const handleClearAll = async () => {
        await NotificationService.clearAll();
        // Move mock ones into a separate state if we wanted to keep them, 
        // but typically "Clear All" should clear everything.
        setNotifications([]);
    };

    const renderItem = ({ item }: { item: AppNotification }) => (
        <View style={[
            styles.notificationItem,
            isDark && styles.cardDark,
            !item.isRead && (isDark ? styles.unreadItemDark : styles.unreadItem)
        ]}>
            <View style={[styles.iconContainer,
            item.type === 'subscription' ? (isDark ? styles.subIconDark : styles.subIcon) :
                item.type === 'alert' ? (isDark ? styles.alertIconDark : styles.alertIcon) : (isDark ? styles.successIconDark : styles.successIcon)
            ]}>
                <Ionicons
                    name={
                        item.type === 'subscription' ? 'receipt-outline' :
                            item.type === 'alert' ? 'warning-outline' : 'checkmark-circle-outline'
                    }
                    size={22}
                    color={isDark ? "#FFF" : "#1A1A1A"}
                />
            </View>
            <View style={styles.content}>
                <View style={styles.itemHeader}>
                    <Text style={[styles.title, isDark && styles.textWhite]}>{item.title}</Text>
                    <Text style={styles.time}>{item.time}</Text>
                </View>
                <Text style={[styles.message, isDark && styles.textGray]} numberOfLines={2}>{item.message}</Text>
            </View>
            <View style={styles.rightActions}>
                {!item.isRead && <View style={styles.unreadDot} />}
                <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={18} color={isDark ? "#FF5252" : "#FF3B30"} />
                </Pressable>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, isDark && styles.bgDark]}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <View style={[styles.header, isDark && styles.dividerDark]}>
                <Pressable onPress={() => router.back()} style={[styles.backButton, isDark && styles.backDark]}>
                    <Ionicons name="arrow-back" size={24} color={isDark ? "#FFF" : "#1A1A1A"} />
                </Pressable>
                <Text style={[styles.headerTitle, isDark && styles.textWhite]}>Notifications</Text>
                <View style={styles.headerRight}>
                    <Pressable onPress={handleMarkAllRead} style={{ marginRight: 15 }}>
                        <Ionicons name="mail-open-outline" size={20} color={isDark ? "#FFD54F" : "#007AFF"} />
                    </Pressable>
                    <Pressable onPress={handleClearAll}>
                        <Ionicons name="trash-outline" size={20} color={isDark ? "#FF5252" : "#FF3B30"} />
                    </Pressable>
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={isDark ? "#FFF" : "#1A1A1A"} />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={64} color={isDark ? "#333" : "#E0E0E0"} />
                            <Text style={styles.emptyText}>No notifications yet</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingTop: Platform.OS === 'android' ? 30 : 0,
    },
    bgDark: {
        backgroundColor: '#0F0F12',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    dividerDark: {
        borderBottomColor: '#1A1A1A',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backDark: {
        backgroundColor: '#1A1A1A',
        borderColor: '#333',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    textWhite: {
        color: '#FFFFFF',
    },
    textGray: {
        color: '#9E9E9E',
    },
    textTintDark: {
        color: '#FFD54F',
    },
    markRead: {
        fontSize: 13,
        fontWeight: '600',
        color: '#007AFF',
    },
    listContent: {
        padding: 20,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FAFAFA',
        alignItems: 'center',
    },
    cardDark: {
        backgroundColor: '#1A1A1A',
        borderColor: '#333',
    },
    unreadItem: {
        backgroundColor: '#F9F9F9',
        borderColor: '#F0F0F0',
    },
    unreadItemDark: {
        backgroundColor: '#222',
        borderColor: '#333',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    subIcon: { backgroundColor: '#E3F2FD' },
    alertIcon: { backgroundColor: '#FFF3E0' },
    successIcon: { backgroundColor: '#E8F5E9' },
    subIconDark: { backgroundColor: '#1A2E44' },
    alertIconDark: { backgroundColor: '#443A1A' },
    successIconDark: { backgroundColor: '#1A442E' },
    content: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    time: {
        fontSize: 12,
        color: '#9E9E9E',
        fontWeight: '500',
    },
    message: {
        fontSize: 13,
        color: '#616161',
        lineHeight: 18,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFD54F',
    },
    rightActions: {
        alignItems: 'center',
        gap: 12,
        marginLeft: 12,
    },
    deleteButton: {
        padding: 4,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
        color: '#9E9E9E',
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
