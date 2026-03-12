import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are handled when the app is foregrounded
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
});

export type AppNotification = {
    id: string;
    title: string;
    message: string;
    time: string;
    type: 'subscription' | 'alert' | 'success';
    isRead: boolean;
    timestamp: number;
};

const STORAGE_KEY = 'app_notifications';

export const NotificationService = {
    async requestPermissions() {
        if (Platform.OS === 'web') return;

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync({
                ios: {
                    allowAlert: true,
                    allowBadge: true,
                    allowSound: true,
                    allowDisplayInCarPlay: true,
                    allowCriticalAlerts: true,
                },
            });
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return false;
        }

        // For iOS specifically, we might need to set the channel for Android but iOS handles it via content
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        return true;
    },

    async sendLocalNotification(title: string, body: string) {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    sound: true, // Specific sound string can be used for iOS but 'true' is default
                    badge: 1,
                    data: { data: 'goes here' },
                },
                trigger: null, // 'null' should work, but for iOS some people use { seconds: 1 }
            });
        } catch (error) {
            console.error('Error scheduling notification:', error);
        }
    },

    async addNotification(title: string, message: string, type: AppNotification['type']) {
        // 1. Show local push notification
        await this.sendLocalNotification(title, message);

        // 2. Save to persistent storage for the notifications list
        try {
            const existing = await AsyncStorage.getItem(STORAGE_KEY);
            const notifications: AppNotification[] = existing ? JSON.parse(existing) : [];

            const newNotif: AppNotification = {
                id: Date.now().toString(),
                title,
                message,
                time: 'Just now',
                type,
                isRead: false,
                timestamp: Date.now(),
            };

            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([newNotif, ...notifications]));
        } catch (e) {
            console.error('Error saving notification:', e);
        }
    },

    async getNotifications(): Promise<AppNotification[]> {
        try {
            const existing = await AsyncStorage.getItem(STORAGE_KEY);
            return existing ? JSON.parse(existing) : [];
        } catch (e) {
            return [];
        }
    },

    async markAllAsRead() {
        try {
            const existing = await this.getNotifications();
            const updated = existing.map(n => ({ ...n, isRead: true }));
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            await Notifications.setBadgeCountAsync(0);
        } catch (e) { }
    },

    async deleteNotification(id: string) {
        try {
            const existing = await this.getNotifications();
            const updated = existing.filter(n => n.id !== id);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (e) { }
    },

    async clearAll() {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
            await Notifications.setBadgeCountAsync(0);
        } catch (e) { }
    }
};
