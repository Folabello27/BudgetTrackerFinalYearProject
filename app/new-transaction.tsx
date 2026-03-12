import { NotificationService } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

const INITIAL_EXPENSE_CATEGORIES = [
    { id: 'Food', name: 'Food', icon: 'fast-food-outline' },
    { id: 'Transport', name: 'Transport', icon: 'car-sport-outline' },
    { id: 'Utilities', name: 'Utilities', icon: 'flash-outline' },
    { id: 'Fun', name: 'Fun', icon: 'game-controller-outline' },
    { id: 'Shopping', name: 'Shopping', icon: 'bag-handle-outline' },
];

const INITIAL_INCOME_CATEGORIES = [
    { id: 'Salary', name: 'Salary', icon: 'cash-outline' },
    { id: 'Freelance', name: 'Freelance', icon: 'briefcase-outline' },
    { id: 'Invest', name: 'Invest', icon: 'trending-up-outline' },
    { id: 'Gift', name: 'Gift', icon: 'gift-outline' },
    { id: 'Savings', name: 'Savings', icon: 'stats-chart-outline' },
];

const ScalePressable = ({ children, onPress, style }: { children: React.ReactNode, onPress?: () => void, style?: any }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
    const onPressOut = () => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    return (
        <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
            <Animated.View style={[style, { transform: [{ scale }] }]}>
                {children}
            </Animated.View>
        </Pressable>
    );
};

const FadeInView = ({ children, delay = 0, style }: { children: React.ReactNode, delay?: number, style?: any }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, delay, useNativeDriver: true }),
        ]).start();
    }, []);
    return (
        <Animated.View style={[style, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {children}
        </Animated.View>
    );
};

export default function CreateTransactionScreen() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    // Date State
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Manual Category State
    const [expenseCategories, setExpenseCategories] = useState(INITIAL_EXPENSE_CATEGORIES);
    const [incomeCategories, setIncomeCategories] = useState(INITIAL_INCOME_CATEGORIES);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const categories = type === 'expense' ? expenseCategories : incomeCategories;

    const handleSave = async () => {
        if (!amount || isNaN(parseFloat(amount))) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount.');
            return;
        }
        if (!selectedCategory) {
            Alert.alert('Category Required', 'Please select a category.');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Error', 'User not authenticated');
                return;
            }

            const { error } = await supabase.from('transactions').insert({
                user_id: user.id,
                amount: parseFloat(amount),
                type,
                category: selectedCategory,
                note,
                date: date.toISOString(),
            });

            if (error) throw error;

            // Trigger Notification
            const categoryObj = categories.find(c => c.id === selectedCategory);
            const detailMsg = `${type === 'expense' ? 'Expense' : 'Income'} of $${parseFloat(amount).toFixed(2)} in ${categoryObj?.name || 'Uncategorized'} recorded.`;

            await NotificationService.addNotification(
                `${type === 'expense' ? 'Expense' : 'Income'} Saved`,
                detailMsg,
                type === 'expense' ? 'alert' : 'success'
            );

            router.replace('/(tabs)');

        } catch (error: any) {
            Alert.alert('Error Saving', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = () => {
        if (!newCategoryName.trim()) return;

        const newName = newCategoryName.trim();
        const newCat = {
            id: newName,
            name: newName,
            icon: 'apps-outline' as any
        };

        if (type === 'expense') {
            setExpenseCategories([...expenseCategories, newCat]);
        } else {
            setIncomeCategories([...incomeCategories, newCat]);
        }

        setNewCategoryName('');
        setIsAddModalVisible(false);
    };

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const formatDate = (d: Date) => {
        return d.toLocaleDateString(undefined, {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <SafeAreaView style={[styles.safeArea, isDark && styles.bgDark]}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.container}>
                        {/* Header */}
                        <FadeInView delay={100} style={styles.header}>
                            <ScalePressable onPress={() => router.back()} style={[styles.backButton, isDark && styles.backDark]}>
                                <Ionicons name="close" size={24} color={isDark ? "#FFF" : "#1A1A1A"} />
                            </ScalePressable>
                            <Text style={[styles.headerTitle, isDark && styles.textWhite]}>New Transaction</Text>
                            <View style={{ width: 44 }} />
                        </FadeInView>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                            {/* Type Toggle */}
                            <FadeInView delay={200} style={[styles.toggleContainer, isDark && styles.toggleDark]}>
                                <Pressable
                                    onPress={() => setType('expense')}
                                    style={[
                                        styles.toggleButton,
                                        type === 'expense' && styles.toggleActiveExp
                                    ]}
                                >
                                    <Text style={[
                                        styles.toggleText,
                                        type === 'expense' && styles.toggleTextActiveExp
                                    ]}>Expense</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => setType('income')}
                                    style={[
                                        styles.toggleButton,
                                        type === 'income' && styles.toggleActiveInc
                                    ]}
                                >
                                    <Text style={[
                                        styles.toggleText,
                                        type === 'income' && styles.toggleTextActiveInc
                                    ]}>Income</Text>
                                </Pressable>
                            </FadeInView>

                            {/* Amount Input */}
                            <FadeInView delay={300} style={styles.amountContainer}>
                                {type === 'income' && <Text style={styles.plusSymbol}>+</Text>}
                                <Text style={[styles.currencySymbol, isDark && styles.textWhite]}>$</Text>
                                <TextInput
                                    style={[styles.amountInput, isDark && styles.textWhite]}
                                    placeholder="0"
                                    placeholderTextColor={isDark ? "#333" : "#E0E0E0"}
                                    keyboardType="decimal-pad"
                                    value={amount}
                                    onChangeText={setAmount}
                                    autoFocus
                                />
                            </FadeInView>
                            <FadeInView delay={350}>
                                <Text style={styles.label}>HOW MUCH?</Text>
                            </FadeInView>

                            {/* Categories Section */}
                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>CATEGORY</Text>
                                <View style={styles.categoryGrid}>
                                    {categories.map((cat, idx) => (
                                        <FadeInView key={cat.id} delay={400 + (idx * 50)} style={styles.categoryItem}>
                                            <ScalePressable
                                                onPress={() => setSelectedCategory(cat.id)}
                                            >
                                                <View style={[
                                                    styles.categoryIcon,
                                                    isDark && styles.cardDark,
                                                    selectedCategory === cat.id && (type === 'expense' ? styles.categoryIconSelectedExp : styles.categoryIconSelectedInc)
                                                ]}>
                                                    <Ionicons
                                                        name={cat.icon as any}
                                                        size={24}
                                                        color={selectedCategory === cat.id ? "#FFF" : (isDark ? "#FFF" : "#1A1A1A")}
                                                    />
                                                </View>
                                                <Text style={[
                                                    styles.categoryName,
                                                    isDark && styles.textWhite,
                                                    selectedCategory === cat.id && styles.categoryNameSelected
                                                ]}>{cat.name}</Text>
                                            </ScalePressable>
                                        </FadeInView>
                                    ))}
                                    <FadeInView delay={400 + (categories.length * 50)} style={styles.categoryItem}>
                                        <ScalePressable
                                            onPress={() => setIsAddModalVisible(true)}
                                        >
                                            <View style={[styles.categoryIconAdd, isDark && styles.cardDark]}>
                                                <Ionicons name="add" size={24} color={isDark ? "#FFF" : "#1A1A1A"} />
                                            </View>
                                            <Text style={[styles.categoryName, isDark && styles.textWhite]}>New</Text>
                                        </ScalePressable>
                                    </FadeInView>
                                </View>
                            </View>

                            {/* Details */}
                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>DETAILS</Text>

                                {/* Date Picker */}
                                <Pressable
                                    style={[styles.detailRow, isDark && styles.cardDark]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <Ionicons name="calendar-outline" size={20} color={isDark ? "#FFF" : "#1A1A1A"} />
                                        <Text style={[styles.detailText, isDark && styles.textWhite]}>{formatDate(date)}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color="#9E9E9E" />
                                </Pressable>

                                {/* Android Date Picker */}
                                {Platform.OS === 'android' && showDatePicker && (
                                    <DateTimePicker
                                        value={date}
                                        mode="date"
                                        display="default"
                                        onChange={onDateChange}
                                    />
                                )}

                                {/* iOS Date Picker Modal */}
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
                                                    value={date}
                                                    mode="date"
                                                    display="spinner"
                                                    onChange={onDateChange}
                                                    textColor={isDark ? "#FFF" : "#000"}
                                                />
                                            </View>
                                        </View>
                                    </Modal>
                                )}

                                {/* Note Input */}
                                <View style={[styles.detailRow, isDark && styles.cardDark]}>
                                    <Ionicons name="create-outline" size={20} color={isDark ? "#FFF" : "#1A1A1A"} style={{ marginRight: 12 }} />
                                    <TextInput
                                        style={[styles.noteInput, isDark && styles.textWhite]}
                                        placeholder="Add a note..."
                                        placeholderTextColor="#9E9E9E"
                                        value={note}
                                        onChangeText={setNote}
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        {/* Footer Save Button */}
                        <FadeInView delay={600} style={[styles.footer, isDark && styles.bgDark, isDark && styles.dividerDark]}>
                            <ScalePressable
                                style={[styles.saveButton, isDark && styles.saveButtonDark]}
                                onPress={handleSave}
                            >
                                {loading ? (
                                    <ActivityIndicator color={isDark ? "#000" : "#FFF"} />
                                ) : (
                                    <Text style={[styles.saveButtonText, isDark && styles.saveButtonTextDark]}>Save Transaction</Text>
                                )}
                            </ScalePressable>
                        </FadeInView>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>

            {/* Custom Category Modal */}
            <Modal
                visible={isAddModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsAddModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDark && styles.cardDark]}>
                        <Text style={[styles.modalTitle, isDark && styles.textWhite]}>New Category</Text>
                        <TextInput
                            style={[styles.modalInput, isDark && styles.inputDark]}
                            placeholder="Category Name"
                            placeholderTextColor="#9E9E9E"
                            value={newCategoryName}
                            onChangeText={setNewCategoryName}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, isDark ? styles.inputDark : styles.modalButtonCancel]}
                                onPress={() => setIsAddModalVisible(false)}
                            >
                                <Text style={[styles.modalButtonTextCancel, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, isDark ? styles.saveButtonDark : styles.modalButtonAdd]}
                                onPress={handleAddCategory}
                            >
                                <Text style={[styles.modalButtonTextAdd, { color: isDark ? '#1A1A1A' : '#FFFFFF' }]}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    bgDark: {
        backgroundColor: '#0F0F12',
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
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
    textWhite: {
        color: '#FFFFFF',
    },
    textBlack: {
        color: '#000000',
    },
    content: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#F5F5F5',
        padding: 4,
        borderRadius: 16,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    toggleDark: {
        backgroundColor: '#1A1A1A',
        borderColor: '#333',
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    toggleActiveExp: {
        backgroundColor: '#FFEBEE',
    },
    toggleActiveInc: {
        backgroundColor: '#E8F5E9',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9E9E9E',
    },
    toggleTextActiveExp: {
        color: '#FF5252',
    },
    toggleTextActiveInc: {
        color: '#4CAF50',
    },
    amountContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    plusSymbol: {
        fontSize: 40,
        fontWeight: '700',
        color: '#4CAF50',
        marginRight: 4,
    },
    currencySymbol: {
        fontSize: 40,
        fontWeight: '700',
        color: '#1A1A1A',
        marginRight: 4,
    },
    amountInput: {
        fontSize: 64,
        fontWeight: '800',
        color: '#1A1A1A',
        minWidth: 100,
        textAlign: 'center',
    },
    label: {
        textAlign: 'center',
        fontSize: 12,
        color: '#9E9E9E',
        marginBottom: 40,
        fontWeight: '700',
        letterSpacing: 2,
    },
    section: {
        marginBottom: 32,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9E9E9E',
        marginBottom: 16,
        letterSpacing: 1,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'flex-start',
    },
    categoryItem: {
        alignItems: 'center',
        gap: 8,
        width: '20%',
    },
    categoryIcon: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: '#FAFAFA',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    cardDark: {
        backgroundColor: '#1A1A1A',
        borderColor: '#333',
    },
    categoryIconSelectedExp: {
        backgroundColor: '#FF5252',
        borderColor: '#FF5252',
    },
    categoryIconSelectedInc: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    categoryIconAdd: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FAFAFA',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    categoryName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#1A1A1A',
        textAlign: 'center',
    },
    categoryNameSelected: {
        fontWeight: '700',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FAFAFA',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    detailText: {
        fontSize: 16,
        color: '#1A1A1A',
        fontWeight: '500',
    },
    noteInput: {
        flex: 1,
        fontSize: 16,
        color: '#1A1A1A',
        padding: 0,
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        backgroundColor: '#FFFFFF',
    },
    dividerDark: {
        borderTopColor: '#333',
    },
    saveButton: {
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        shadowColor: '#1A1A1A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonDark: {
        backgroundColor: '#FFFFFF',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    saveButtonTextDark: {
        color: '#000000',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        gap: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'center',
    },
    modalInput: {
        backgroundColor: '#F5F5F5',
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        color: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    inputDark: {
        backgroundColor: '#333',
        borderColor: '#444',
        color: '#FFF',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalButtonCancel: {
        backgroundColor: '#F5F5F5',
    },
    modalButtonAdd: {
        backgroundColor: '#1A1A1A',
    },
    modalButtonTextCancel: {
        color: '#9E9E9E',
        fontWeight: '600',
    },
    modalButtonTextAdd: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    iosPickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    iosPickerContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
    },
    iosPickerHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    iosPickerDone: {
        fontSize: 17,
        fontWeight: '600',
        color: '#007AFF',
    },
});
