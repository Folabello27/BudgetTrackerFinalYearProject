import { NotificationService } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
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
const GRID_PADDING = 24 * 2; // Matches scrollContent padding
const GRID_GAP = 12;
const ICON_SIZE = (width - GRID_PADDING - (GRID_GAP * 4)) / 5;
const COLOR_SIZE = (width - GRID_PADDING - (GRID_GAP * 4)) / 5;

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

export default function AddSubscriptionScreen() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Form State
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [period, setPeriod] = useState<'MO' | 'YR'>('MO');
    const [selectedIcon, setSelectedIcon] = useState<keyof typeof Ionicons.glyphMap>('apps-outline');
    const [selectedColor, setSelectedColor] = useState('#F5F5F5');
    const [billDate, setBillDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!name.trim() || !amount.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const parsedAmount = parseFloat(amount);
            const subName = name.trim();

            const { error } = await supabase.from('subscriptions').insert({
                user_id: user.id,
                name: subName,
                amount: parsedAmount,
                period,
                next_bill: billDate.toISOString(),
                icon: selectedIcon,
                color: selectedColor,
                status: 'active'
            });

            if (error) throw error;

            // Trigger Notification
            await NotificationService.addNotification(
                'Subscription Added',
                `${subName} has been added to your radar for $${parsedAmount.toFixed(2)}/${period.toLowerCase()}.`,
                'subscription'
            );

            router.back();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (selectedDate) setBillDate(selectedDate);
    };

    return (
        <SafeAreaView style={[styles.container, isDark && styles.bgDark]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={[styles.headerButton, isDark && styles.backDark]}>
                    <Ionicons name="arrow-back" size={24} color={isDark ? "#FFF" : "#1A1A1A"} />
                </Pressable>
                <Text style={[styles.headerTitle, isDark && styles.textWhite]}>New Subscription</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>DETAILS</Text>
                        <TextInput
                            style={[styles.input, isDark && styles.inputDark, isDark && styles.textWhite]}
                            placeholder="Service Name (e.g. Netflix)"
                            value={name}
                            onChangeText={setName}
                            placeholderTextColor="#9E9E9E"
                        />

                        <View style={styles.amountRow}>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark, isDark && styles.textWhite, { flex: 1, marginRight: 12 }]}
                                placeholder="Price"
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="decimal-pad"
                                placeholderTextColor="#9E9E9E"
                            />
                            <View style={[styles.periodToggle, isDark && styles.inputDark]}>
                                <Pressable
                                    style={[styles.periodBtn, period === 'MO' && (isDark ? styles.periodBtnActiveDark : styles.periodBtnActive)]}
                                    onPress={() => setPeriod('MO')}
                                >
                                    <Text style={[styles.periodBtnText, period === 'MO' && (isDark ? styles.textWhite : styles.periodBtnTextActive)]}>Monthly</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.periodBtn, period === 'YR' && (isDark ? styles.periodBtnActiveDark : styles.periodBtnActive)]}
                                    onPress={() => setPeriod('YR')}
                                >
                                    <Text style={[styles.periodBtnText, period === 'YR' && (isDark ? styles.textWhite : styles.periodBtnTextActive)]}>Yearly</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>BILLING DATE</Text>
                        <Pressable style={[styles.dateBtn, isDark && styles.inputDark]} onPress={() => setShowDatePicker(true)}>
                            <Ionicons name="calendar-outline" size={20} color={isDark ? "#FFF" : "#1A1A1A"} style={{ marginRight: 12 }} />
                            <Text style={[styles.dateText, isDark && styles.textWhite]}>{formatDate(billDate)}</Text>
                        </Pressable>

                        {Platform.OS === 'android' && showDatePicker && (
                            <DateTimePicker
                                value={billDate}
                                mode="date"
                                display="default"
                                onChange={onDateChange}
                                minimumDate={new Date()}
                            />
                        )}

                        {Platform.OS === 'ios' && (
                            <Modal
                                visible={showDatePicker}
                                transparent
                                animationType="slide"
                            >
                                <View style={styles.iosPickerOverlay}>
                                    <View style={[styles.iosPickerContainer, isDark && styles.bgDark]}>
                                        <View style={[styles.iosPickerHeader, isDark && styles.dividerDark]}>
                                            <Pressable onPress={() => setShowDatePicker(false)}>
                                                <Text style={styles.iosPickerDone}>Done</Text>
                                            </Pressable>
                                        </View>
                                        <DateTimePicker
                                            value={billDate}
                                            mode="date"
                                            display="spinner"
                                            onChange={onDateChange}
                                            minimumDate={new Date()}
                                            textColor={isDark ? "#FFF" : "#000"}
                                        />
                                    </View>
                                </View>
                            </Modal>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>APPEARANCE</Text>

                        <Text style={styles.pickerLabel}>Choose Icon</Text>
                        <View style={styles.pickerGrid}>
                            {AVAILABLE_ICONS.map((icon) => (
                                <Pressable
                                    key={icon}
                                    style={[styles.iconOption, isDark && styles.inputDark, selectedIcon === icon && (isDark ? styles.iconActiveDark : styles.iconActive)]}
                                    onPress={() => setSelectedIcon(icon)}
                                >
                                    <Ionicons name={icon} size={24} color={selectedIcon === icon ? (isDark ? "#000" : "#FFFFFF") : (isDark ? "#FFF" : "#1A1A1A")} />
                                </Pressable>
                            ))}
                        </View>

                        <Text style={styles.pickerLabel}>Choose Color</Text>
                        <View style={styles.pickerGrid}>
                            {AVAILABLE_COLORS.map((color) => (
                                <Pressable
                                    key={color}
                                    style={[styles.colorOption, { backgroundColor: color }, selectedColor === color && styles.colorActive]}
                                    onPress={() => setSelectedColor(color)}
                                />
                            ))}
                        </View>
                    </View>

                    <Pressable style={[styles.saveBtn, isDark && styles.saveBtnDark]} onPress={handleSave}>
                        <Text style={[styles.saveBtnText, isDark && styles.textBlack]}>Save Subscription</Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
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
    scrollContent: { padding: 24, gap: 32, paddingBottom: 40 },
    inputGroup: { gap: 12 },
    fieldLabel: { fontSize: 12, fontWeight: '800', color: '#9E9E9E', letterSpacing: 1 },
    input: { backgroundColor: '#FAFAFA', borderRadius: 16, padding: 16, fontSize: 16, color: '#1A1A1A', borderWidth: 1, borderColor: '#F0F0F0' },
    inputDark: { backgroundColor: '#1A1A1A', borderColor: '#333' },
    amountRow: { flexDirection: 'row', alignItems: 'center' },
    periodToggle: { flexDirection: 'row', backgroundColor: '#F5F5F5', padding: 4, borderRadius: 12, width: 160 },
    periodBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    periodBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    periodBtnActiveDark: { backgroundColor: '#333' },
    periodBtnText: { fontSize: 12, fontWeight: '600', color: '#9E9E9E' },
    periodBtnTextActive: { color: '#1A1A1A' },
    dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F0F0F0' },
    dateText: { fontSize: 16, color: '#1A1A1A', fontWeight: '600' },
    pickerLabel: { fontSize: 13, fontWeight: '600', color: '#9E9E9E', marginTop: 16 },
    pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
    iconOption: { width: ICON_SIZE, height: ICON_SIZE, borderRadius: 16, backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0' },
    iconActive: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
    iconActiveDark: { backgroundColor: '#FFF', borderColor: '#FFF' },
    colorOption: { width: COLOR_SIZE, height: COLOR_SIZE, borderRadius: COLOR_SIZE / 2, borderWidth: 2, borderColor: 'transparent' },
    colorActive: { borderColor: '#1A1A1A' },
    saveBtn: { backgroundColor: '#1A1A1A', borderRadius: 20, paddingVertical: 18, alignItems: 'center', marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    saveBtnDark: { backgroundColor: '#FFF' },
    saveBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
    iosPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    iosPickerContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
    iosPickerHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    dividerDark: { borderBottomColor: '#333' },
    iosPickerDone: { fontSize: 17, fontWeight: '600', color: '#007AFF' },
});
