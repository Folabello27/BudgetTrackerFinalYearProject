import { useCurrency } from '@/hooks/use-currency';
import { NotificationService } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

const AVAILABLE_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
    'tv-outline', 'musical-notes-outline', 'cloud-outline', 'logo-figma',
    'barbell-outline', 'game-controller-outline', 'newspaper-outline',
    'logo-apple', 'logo-amazon', 'logo-android', 'logo-playstation',
    'logo-xbox', 'apps-outline', 'briefcase-outline', 'cart-outline',
    'fast-food-outline', 'home-outline', 'car-sport-outline', 'wifi-outline',
    'cellular-outline', 'flask-outline', 'school-outline'
];

const AVAILABLE_COLORS = [
    '#FFEBEE', '#E8F5E9', '#E3F2FD', '#F3E5F5', '#FFF3E0', '#F5F5F5',
    '#E0F7FA', '#F1F8E9', '#FFFDE7', '#EFEBE9', '#FFCCBC', '#C8E6C9'
];

export default function SubscriptionDetailsScreen() {
    const { theme } = useTheme();
    const { format } = useCurrency();
    const isDark = theme === 'dark';
    const params = useLocalSearchParams();

    // UI State for interactivity
    const [isMuted, setIsMuted] = useState(false);
    const [daysToGo, setDaysToGo] = useState<number | string>('--');
    const [nextOccurrence, setNextOccurrence] = useState<string>('--');
    const [loading, setLoading] = useState(false);

    // Edit Modal State
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editPeriod, setEditPeriod] = useState<'MO' | 'YR'>('MO');
    const [editIcon, setEditIcon] = useState<keyof typeof Ionicons.glyphMap>('apps-outline');
    const [editColor, setEditColor] = useState('#F5F5F5');
    const [editDate, setEditDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Current subscription data (initially from params)
    const [sub, setSub] = useState({
        id: params.id as string,
        name: params.name as string || 'Netflix',
        amount: parseFloat(params.amount as string || '15.99'),
        period: (params.period as 'MO' | 'YR') || 'MO',
        nextBillText: params.nextBill || params.next_bill || 'Oct 24, 2026',
        icon: (params.icon as any) || 'tv-outline',
        color: params.color as string || '#FFEBEE',
        status: (params.status as 'active' | 'cancelled') || 'active',
    });

    useEffect(() => {
        calculateNextBilling(sub);
    }, [sub]);

    const calculateNextBilling = async (targetSub: typeof sub) => {
        try {
            const today = new Date('2026-02-11T18:17:50');
            today.setHours(0, 0, 0, 0);

            let billDate = new Date(targetSub.nextBillText);

            if (isNaN(billDate.getTime())) {
                if (targetSub.nextBillText.toLowerCase() === 'tomorrow') {
                    billDate = new Date(today);
                    billDate.setDate(today.getDate() + 1);
                } else {
                    const match = targetSub.nextBillText.match(/\d+/);
                    const days = match ? parseInt(match[0]) : 0;
                    billDate = new Date(today);
                    billDate.setDate(today.getDate() + days);
                }
            }

            let nextDate = new Date(billDate);
            while (nextDate < today) {
                if (targetSub.period === 'MO') {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                } else {
                    nextDate.setFullYear(nextDate.getFullYear() + 1);
                }
            }

            const diffTime = nextDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            setDaysToGo(diffDays);
            setNextOccurrence(nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
        } catch (e) {
            setDaysToGo('--');
            setNextOccurrence('--');
        }
    };

    const handleEdit = () => {
        setEditName(sub.name);
        setEditAmount(sub.amount.toString());
        setEditPeriod(sub.period);
        setEditIcon(sub.icon);
        setEditColor(sub.color);

        let initialDate = new Date(sub.nextBillText);
        if (isNaN(initialDate.getTime())) initialDate = new Date();
        setEditDate(initialDate);

        setIsEditModalVisible(true);
    };

    const saveEdit = async () => {
        if (!editName.trim() || !editAmount.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('subscriptions')
                .update({
                    name: editName.trim(),
                    amount: parseFloat(editAmount),
                    period: editPeriod,
                    icon: editIcon,
                    color: editColor,
                    next_bill: editDate.toISOString(),
                })
                .eq('id', sub.id);

            if (error) throw error;

            const updatedSub = {
                ...sub,
                name: editName.trim(),
                amount: parseFloat(editAmount),
                period: editPeriod,
                icon: editIcon,
                color: editColor,
                nextBillText: editDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            };

            setSub(updatedSub);
            setIsEditModalVisible(false);
            Alert.alert('Success', 'Subscription updated successfully');

            await NotificationService.addNotification(
                'Subscription Updated',
                `${editName} details have been updated.`,
                'success'
            );
        } catch (e: any) {
            Alert.alert('Update Failed', e.message);
        } finally {
            setLoading(false);
        }
    };

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (selectedDate) setEditDate(selectedDate);
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Subscription",
            `Are you sure you want to delete ${sub.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const { error } = await supabase
                                .from('subscriptions')
                                .delete()
                                .eq('id', sub.id);

                            if (error) throw error;

                            await NotificationService.addNotification(
                                'Subscription Deleted',
                                `${sub.name} has been removed from your radar.`,
                                'alert'
                            );
                            router.back();
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleToggleMute = () => {
        setIsMuted(!isMuted);
        Alert.alert(
            isMuted ? "Notifications Enabled" : "Notifications Muted",
            `You will ${isMuted ? 'now' : 'no longer'} receive alerts for ${sub.name}.`
        );
    };

    const handleToggleStatus = () => {
        const nextStatus = sub.status === 'active' ? 'cancelled' : 'active';
        const action = sub.status === 'active' ? 'cancel' : 'reactivate';

        Alert.alert(
            `${action.charAt(0).toUpperCase() + action.slice(1)} Subscription`,
            `Are you sure you want to ${action} ${sub.name}?`,
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('subscriptions')
                                .update({ status: nextStatus })
                                .eq('id', sub.id);

                            if (error) throw error;

                            setSub({ ...sub, status: nextStatus });
                            Alert.alert('Success', `Subscription ${nextStatus}`);
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            <View style={[styles.navHeader, isDark && styles.navHeaderDark]}>
                <Pressable onPress={() => router.back()} style={[styles.backButton, isDark && styles.backButtonDark]}>
                    <Ionicons name="arrow-back" size={24} color={isDark ? "#FFF" : "#1A1A1A"} />
                </Pressable>
                <Text style={[styles.navTitle, isDark && styles.textWhite]}>Details</Text>
                <Pressable style={styles.editButton} onPress={handleEdit}>
                    <Text style={[styles.editText, isDark && styles.textTintDark]}>Edit</Text>
                </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.heroSection}>
                    <View style={[styles.largeIconContainer, { backgroundColor: isDark ? "#333" : sub.color }]}>
                        <Ionicons name={sub.icon} size={48} color={isDark ? "#FFF" : "#1A1A1A"} />
                    </View>
                    <Text style={[styles.subName, isDark && styles.textWhite]}>{sub.name}</Text>
                    <View style={styles.amountContainer}>
                        <Text style={[styles.amountValue, isDark && styles.textWhite]}>{format(sub.amount)}</Text>
                        <Text style={[styles.periodLabel, isDark && styles.periodLabelDark]}>/{sub.period === 'MO' ? 'month' : 'year'}</Text>
                        {sub.status === 'cancelled' && (
                            <View style={[styles.cancelledBadge, isDark && styles.cancelledBadgeDark]}>
                                <Text style={[styles.cancelledText, isDark && styles.textGray]}>CANCELLED</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <View style={[styles.infoCard, isDark && styles.cardDark]}>
                        <Text style={[styles.infoLabel, isDark && styles.infoLabelDark]}>Next Bill</Text>
                        <Text style={[styles.infoValue, isDark && styles.textWhite]}>{nextOccurrence}</Text>
                    </View>
                    <View style={[styles.infoCard, isDark && styles.cardDark]}>
                        <Text style={[styles.infoLabel, isDark && styles.infoLabelDark]}>Billing Cycle</Text>
                        <Text style={[styles.infoValue, isDark && styles.textWhite]}>{sub.period === 'MO' ? 'Monthly' : 'Yearly'}</Text>
                    </View>
                </View>

                <View style={styles.statsSection}>
                    <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Overview</Text>
                    <View style={[styles.overviewCard, isDark && styles.overviewCardDark]}>
                        <View style={styles.overviewRow}>
                            <View style={styles.overviewItem}>
                                <Text style={styles.overviewLabel}>Yearly Cost</Text>
                                <Text style={styles.overviewValue}>{format(sub.period === 'MO' ? sub.amount * 12 : sub.amount)}</Text>
                            </View>
                            <View style={styles.verticalDivider} />
                            <View style={styles.overviewItem}>
                                <Text style={styles.overviewLabel}>Days Remaining</Text>
                                <Text style={styles.overviewValue}>{daysToGo} Days</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.actionsSection}>
                    <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Actions</Text>

                    <Pressable style={[styles.actionItem, isDark && styles.cardDark]} onPress={handleToggleMute}>
                        <View style={[styles.actionIcon, isDark ? (isMuted ? styles.actionIconMutedDark : styles.actionIconDark) : (isMuted ? styles.actionIconMuted : styles.actionIconLight)]}>
                            <Ionicons
                                name={isMuted ? "notifications-off-outline" : "notifications-outline"}
                                size={20}
                                color={isMuted ? "#FF9800" : (isDark ? "#FFF" : "#1A1A1A")}
                            />
                        </View>
                        <Text style={[styles.actionText, isDark && styles.textWhite]}>
                            {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                        </Text>
                        <View style={styles.actionRight}>
                            {isMuted && <Text style={styles.statusIn}>Muted</Text>}
                            <Ionicons name="chevron-forward" size={18} color="#9E9E9E" />
                        </View>
                    </Pressable>

                    <Pressable style={[styles.actionItem, isDark && styles.cardDark]} onPress={handleToggleStatus}>
                        <View style={[styles.actionIcon, isDark ? styles.actionIconDark : styles.actionIconLight]}>
                            <Ionicons
                                name={sub.status === 'active' ? "close-circle-outline" : "refresh-circle-outline"}
                                size={20}
                                color={isDark ? "#FFF" : "#1A1A1A"}
                            />
                        </View>
                        <Text style={[styles.actionText, isDark && styles.textWhite]}>
                            {sub.status === 'active' ? 'Cancel Subscription' : 'Reactivate Subscription'}
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color="#9E9E9E" />
                    </Pressable>

                    <Pressable style={[styles.actionItem, isDark && styles.cardDark]} onPress={handleDelete}>
                        <View style={[styles.actionIcon, isDark ? styles.actionIconDeleteDark : styles.actionIconDelete]}>
                            <Ionicons name="trash-outline" size={20} color="#F44336" />
                        </View>
                        <Text style={[styles.actionText, { color: '#F44336' }]}>Delete Permanently</Text>
                        <Ionicons name="chevron-forward" size={18} color="#9E9E9E" />
                    </Pressable>
                </View>
            </ScrollView>

            {/* Edit Modal */}
            <Modal
                visible={isEditModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.keyboardView}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    >
                        <View style={[styles.modalContent, isDark && styles.cardDark]}>
                            <View style={styles.dragHandle} />
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, isDark && styles.textWhite]}>Edit Subscription</Text>
                                <Pressable onPress={() => setIsEditModalVisible(false)} style={[styles.closeModalBtn, isDark && styles.closeModalBtnDark]}>
                                    <Ionicons name="close" size={24} color={isDark ? "#FFF" : "#1A1A1A"} />
                                </Pressable>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.fieldLabel}>DETAILS</Text>
                                    <TextInput
                                        style={[styles.modalInput, isDark && styles.inputDark, isDark && styles.textWhite]}
                                        placeholder="Service Name"
                                        value={editName}
                                        onChangeText={setEditName}
                                        placeholderTextColor="#9E9E9E"
                                    />

                                    <View style={styles.amountInputRow}>
                                        <TextInput
                                            style={[styles.modalInput, isDark && styles.inputDark, isDark && styles.textWhite, { flex: 1, marginRight: 12 }]}
                                            placeholder="Price"
                                            value={editAmount}
                                            onChangeText={setEditAmount}
                                            keyboardType="decimal-pad"
                                            placeholderTextColor="#9E9E9E"
                                        />
                                        <View style={[styles.smallPeriodToggle, isDark && styles.inputDark]}>
                                            <Pressable
                                                style={[styles.smallPeriodBtn, editPeriod === 'MO' && (isDark ? styles.smallPeriodBtnActiveDark : styles.smallPeriodBtnActive)]}
                                                onPress={() => setEditPeriod('MO')}
                                            >
                                                <Text style={[styles.smallPeriodBtnText, editPeriod === 'MO' && (isDark ? styles.textWhite : styles.smallPeriodBtnTextActive)]}>Monthly</Text>
                                            </Pressable>
                                            <Pressable
                                                style={[styles.smallPeriodBtn, editPeriod === 'YR' && (isDark ? styles.smallPeriodBtnActiveDark : styles.smallPeriodBtnActive)]}
                                                onPress={() => setEditPeriod('YR')}
                                            >
                                                <Text style={[styles.smallPeriodBtnText, editPeriod === 'YR' && (isDark ? styles.textWhite : styles.smallPeriodBtnTextActive)]}>Yearly</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.fieldLabel}>BILLING DATE</Text>
                                    <Pressable style={[styles.datePickerBtn, isDark && styles.inputDark]} onPress={() => setShowDatePicker(true)}>
                                        <Ionicons name="calendar-outline" size={20} color={isDark ? "#FFF" : "#1A1A1A"} style={{ marginRight: 12 }} />
                                        <Text style={[styles.datePickerText, isDark && styles.textWhite]}>{editDate.toLocaleDateString()}</Text>
                                    </Pressable>

                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={editDate}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={onDateChange}
                                            textColor={isDark ? "#FFF" : "#000"}
                                        />
                                    )}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.fieldLabel}>APPEARANCE</Text>
                                    <View style={styles.pickerSection}>
                                        <Text style={styles.pickerLabel}>Icon</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconPicker}>
                                            {AVAILABLE_ICONS.map((icon) => (
                                                <Pressable
                                                    key={icon}
                                                    style={[styles.iconOption, isDark && styles.inputDark, editIcon === icon && (isDark ? styles.iconOptionActiveDark : styles.iconOptionActive)]}
                                                    onPress={() => setEditIcon(icon)}
                                                >
                                                    <Ionicons name={icon} size={24} color={editIcon === icon ? (isDark ? "#000" : "#FFFFFF") : (isDark ? "#FFF" : "#1A1A1A")} />
                                                </Pressable>
                                            ))}
                                        </ScrollView>

                                        <Text style={styles.pickerLabel}>Color</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
                                            {AVAILABLE_COLORS.map((color) => (
                                                <Pressable
                                                    key={color}
                                                    style={[styles.colorOption, { backgroundColor: color }, editColor === color && styles.colorOptionActive]}
                                                    onPress={() => setEditColor(color)}
                                                />
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>

                                <Pressable style={[styles.saveBtn, isDark && styles.saveBtnDark]} onPress={saveEdit}>
                                    <Text style={[styles.saveBtnText, isDark && styles.textBlack]}>Save Changes</Text>
                                </Pressable>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    containerDark: { backgroundColor: '#0F0F12' },
    navHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    navHeaderDark: { borderBottomColor: '#1A1A1A' },
    backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
    backButtonDark: { backgroundColor: '#1A1A1A', borderColor: '#333' },
    navTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
    editButton: { paddingHorizontal: 16, paddingVertical: 8 },
    editText: { fontSize: 16, fontWeight: '600', color: '#007AFF' },
    scrollContent: { padding: 24, gap: 32 },
    heroSection: { alignItems: 'center', gap: 12 },
    largeIconContainer: { width: 100, height: 100, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5 },
    subName: { fontSize: 28, fontWeight: '800', color: '#1A1A1A' },
    amountContainer: { flexDirection: 'row', alignItems: 'baseline' },
    currency: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginTop: 4 },
    amountValue: { fontSize: 48, fontWeight: '800', color: '#1A1A1A' },
    periodLabel: { fontSize: 16, fontWeight: '600', color: '#9E9E9E', marginLeft: 4 },
    cancelledBadge: { backgroundColor: '#F5F5F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 4 },
    cancelledBadgeDark: { backgroundColor: '#333' },
    cancelledText: { fontSize: 12, fontWeight: '800', color: '#9E9E9E', letterSpacing: 1 },
    infoRow: { flexDirection: 'row', gap: 16 },
    infoCard: { flex: 1, backgroundColor: '#FAFAFA', borderRadius: 20, padding: 16, gap: 4, borderWidth: 1, borderColor: '#F5F5F5' },
    cardDark: { backgroundColor: '#1A1A1A', borderColor: '#333' },
    infoLabel: { fontSize: 12, fontWeight: '600', color: '#9E9E9E', textTransform: 'uppercase' },
    infoValue: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
    statsSection: { gap: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    overviewCard: { backgroundColor: '#1A1A1A', borderRadius: 24, padding: 24 },
    overviewCardDark: { backgroundColor: '#222' },
    overviewRow: { flexDirection: 'row', alignItems: 'center' },
    overviewItem: { flex: 1, gap: 8 },
    overviewLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
    overviewValue: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
    verticalDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20 },
    actionsSection: { gap: 12, marginBottom: 20 },
    actionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#F5F5F5' },
    actionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    actionIconLight: { backgroundColor: '#F5F5F5' },
    actionIconDark: { backgroundColor: '#333' },
    actionIconMuted: { backgroundColor: '#FFF3E0' },
    actionIconMutedDark: { backgroundColor: '#443A1A' },
    actionIconDelete: { backgroundColor: '#FFEBEE' },
    actionIconDeleteDark: { backgroundColor: '#441A1A' },
    actionText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
    actionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusIn: { fontSize: 12, fontWeight: '600', color: '#FF9800' },
    textWhite: { color: '#FFF' },
    textGray: { color: '#9E9E9E' },
    textTintDark: { color: '#FFD54F' },
    textBlack: { color: '#000' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    keyboardView: { width: '100%' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 0, maxHeight: '92%' },
    dragHandle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    closeModalBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
    closeModalBtnDark: { backgroundColor: '#333' },
    modalTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
    formScroll: { gap: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
    inputGroup: { gap: 12 },
    fieldLabel: { fontSize: 12, fontWeight: '800', color: '#9E9E9E', letterSpacing: 1 },
    modalInput: { backgroundColor: '#FAFAFA', borderRadius: 16, padding: 16, fontSize: 16, color: '#1A1A1A', borderWidth: 1, borderColor: '#F0F0F0' },
    inputDark: { backgroundColor: '#333', borderColor: '#444' },
    amountInputRow: { flexDirection: 'row', alignItems: 'center' },
    smallPeriodToggle: { flexDirection: 'row', backgroundColor: '#F5F5F5', padding: 4, borderRadius: 12, width: 150 },
    smallPeriodBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    smallPeriodBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    smallPeriodBtnActiveDark: { backgroundColor: '#444' },
    smallPeriodBtnText: { fontSize: 12, fontWeight: '600', color: '#9E9E9E' },
    smallPeriodBtnTextActive: { color: '#1A1A1A' },
    datePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F0F0F0' },
    datePickerText: { fontSize: 16, color: '#1A1A1A', fontWeight: '600' },
    pickerSection: { gap: 10 },
    pickerLabel: { fontSize: 13, fontWeight: '600', color: '#9E9E9E' },
    iconPicker: { flexDirection: 'row', paddingVertical: 8 },
    iconOption: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#F0F0F0' },
    iconOptionActive: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
    iconOptionActiveDark: { backgroundColor: '#FFF', borderColor: '#FFF' },
    colorPicker: { flexDirection: 'row', paddingVertical: 8 },
    colorOption: { width: 40, height: 40, borderRadius: 20, marginRight: 10, borderWidth: 2, borderColor: 'transparent' },
    colorOptionActive: { borderColor: '#1A1A1A' },
    saveBtn: { backgroundColor: '#1A1A1A', borderRadius: 20, paddingVertical: 18, alignItems: 'center', marginTop: 12, shadowColor: '#1A1A1A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    saveBtnDark: { backgroundColor: '#FFF' },
    saveBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
});
