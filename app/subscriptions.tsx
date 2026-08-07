import { useCurrency } from '@/hooks/use-currency';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
    FlatList,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View
} from 'react-native';

type Subscription = {
    id: string;
    name: string;
    amount: number;
    period: 'MO' | 'YR';
    nextBill: Date;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    status: 'active' | 'cancelled';
};

const INITIAL_SUBSCRIPTIONS: Subscription[] = [
    { id: '1', name: 'Netflix', amount: 15.99, period: 'MO', nextBill: new Date(2026, 9, 24), icon: 'tv-outline', color: '#FFEBEE', status: 'active' },
    { id: '2', name: 'Spotify Premium', amount: 10.99, period: 'MO', nextBill: new Date(2026, 9, 28), icon: 'musical-notes-outline', color: '#E8F5E9', status: 'active' },
    { id: '3', name: 'Dropbox Plus', amount: 119.00, period: 'YR', nextBill: new Date(2026, 10, 15), icon: 'cloud-outline', color: '#E3F2FD', status: 'active' },
    { id: '4', name: 'Figma Professional', amount: 15.00, period: 'MO', nextBill: new Date(2026, 10, 1), icon: 'logo-figma', color: '#F3E5F5', status: 'active' },
    { id: '5', name: 'Gym Membership', amount: 45.00, period: 'MO', nextBill: new Date(2026, 9, 30), icon: 'barbell-outline', color: '#F5F5F5', status: 'cancelled' },
];

export default function SubscriptionsScreen() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const { format } = useCurrency();
    const [subs, setSubs] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchSubscriptions();
        }, [])
    );

    const fetchSubscriptions = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .order('next_bill', { ascending: true });

            if (error) throw error;

            if (data) {
                const mapped: Subscription[] = data.map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    amount: Number(s.amount),
                    period: s.period,
                    nextBill: new Date(s.next_bill),
                    icon: s.icon,
                    color: s.color,
                    status: s.status
                }));
                setSubs(mapped);
            }
        } catch (error) {
            console.log('Error fetching subs:', error);
        } finally {
            setLoading(false);
        }
    };

    const activeSubs = subs.filter(s => s.status === 'active');
    const monthlyTotal = activeSubs.reduce((acc, curr) => {
        return acc + (curr.period === 'MO' ? curr.amount : curr.amount / 12);
    }, 0);

    const yearlyTotal = monthlyTotal * 12;

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const renderItem = ({ item }: { item: Subscription }) => (
        <Pressable
            style={[styles.subItem, isDark && styles.cardDark]}
            onPress={() => router.push({
                pathname: '/subscription-details',
                params: {
                    id: item.id,
                    name: item.name,
                    amount: item.amount,
                    period: item.period,
                    nextBill: formatDate(item.nextBill),
                    icon: item.icon,
                    color: item.color,
                    status: item.status
                }
            })}
        >
            <View style={[styles.subIconContainer, { backgroundColor: isDark ? "#333" : item.color }]}>
                <Ionicons name={item.icon} size={24} color={isDark ? "#FFF" : "#1A1A1A"} />
            </View>
            <View style={styles.subDetails}>
                <Text style={[styles.subName, isDark && styles.textWhite]}>{item.name}</Text>
                <View style={styles.subMeta}>
                    <View style={[styles.periodBadge, isDark && styles.badgeDark]}>
                        <Text style={[styles.periodText, isDark && styles.textWhite]}>{item.period}</Text>
                    </View>
                    <Text style={styles.nextBillText}>
                        {item.status === 'cancelled' ? `Ends: ${formatDate(item.nextBill)}` : `Next: ${formatDate(item.nextBill)}`}
                    </Text>
                </View>
            </View>
            <View style={styles.subRight}>
                <Text style={[styles.subAmount, isDark && styles.textWhite]}>{format(item.amount)}</Text>
                {item.status === 'cancelled' && (
                    <Text style={[styles.cancelledLabel, isDark && styles.cancelledLabelDark]}>Cancelled</Text>
                )}
            </View>
        </Pressable>
    );

    return (
        <SafeAreaView style={[styles.container, isDark && styles.bgDark]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={[styles.headerButton, isDark && styles.backDark]}>
                    <Ionicons name="arrow-back" size={24} color={isDark ? "#FFF" : "#1A1A1A"} />
                </Pressable>
                <Text style={[styles.headerTitle, isDark && styles.textWhite]}>Subscriptions</Text>
                <Pressable onPress={() => router.push('/add-subscription')} style={[styles.headerButton, isDark && styles.backDark]}>
                    <Ionicons name="add" size={24} color={isDark ? "#FFF" : "#1A1A1A"} />
                </Pressable>
            </View>

            <FlatList
                data={subs}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={() => (
                    <>
                        <View style={[styles.summaryCard, isDark && styles.summaryCardDark]}>
                            <Text style={styles.summaryLabel}>Monthly Average</Text>
                            <Text style={styles.summaryAmount}>{format(monthlyTotal)}</Text>

                            <View style={styles.statsDivider} />

                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{activeSubs.length}</Text>
                                    <Text style={styles.statLabel}>Active</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{format(yearlyTotal)}</Text>
                                    <Text style={styles.statLabel}>Yearly Proj.</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{formatDate(activeSubs[0]?.nextBill || new Date())}</Text>
                                    <Text style={styles.statLabel}>Next Bill</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>Upcoming Bills</Text>
                            <Pressable>
                                <Text style={styles.sortText}>Sort by Date</Text>
                            </Pressable>
                        </View>
                    </>
                )}
            />

            <Pressable onPress={() => router.push('/add-subscription')} style={[styles.fab, isDark && styles.fabDark]}>
                <Ionicons name="add" size={32} color={isDark ? "#000" : "#FFFFFF"} />
            </Pressable>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? 30 : 0 },
    bgDark: { backgroundColor: '#0F0F12' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
    headerButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
    backDark: { backgroundColor: '#1A1A1A', borderColor: '#333' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    textWhite: { color: '#FFFFFF' },
    textBlack: { color: '#000' },
    listContent: { padding: 20, paddingBottom: 120 },
    summaryCard: { backgroundColor: '#1A1A1A', borderRadius: 24, padding: 24, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    summaryCardDark: { backgroundColor: '#222' },
    summaryLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600', marginBottom: 8 },
    summaryAmount: { color: '#FFFFFF', fontSize: 36, fontWeight: '800', marginBottom: 24 },
    statsDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 20 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    statItem: { gap: 4 },
    statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    sortText: { fontSize: 14, color: '#9E9E9E', fontWeight: '600' },
    sortTextDark: { color: '#D1D5DB' },
    subItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F5F5F5' },
    cardDark: { backgroundColor: '#1A1A1A', borderColor: '#333' },
    subIconContainer: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    subDetails: { flex: 1, gap: 4 },
    subName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
    subMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    periodBadge: { backgroundColor: '#F5F5F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    badgeDark: { backgroundColor: '#333' },
    periodText: { fontSize: 10, fontWeight: '800', color: '#1A1A1A' },
    nextBillText: { fontSize: 13, color: '#9E9E9E', fontWeight: '500' },
    subRight: { alignItems: 'flex-end', gap: 4 },
    subAmount: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
    cancelledLabel: { fontSize: 11, color: '#9E9E9E', fontWeight: '600', fontStyle: 'italic' },
    cancelledLabelDark: { color: '#D1D5DB' },
    fab: { position: 'absolute', bottom: 30, right: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' },
    fabDark: { backgroundColor: '#FFF' },
});
