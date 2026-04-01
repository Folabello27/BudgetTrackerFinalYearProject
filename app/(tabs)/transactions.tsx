import { useCurrency } from '@/hooks/use-currency';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

// --- Types ---
type Transaction = {
  id: string;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  note: string;
  date: string; // ISO string
  displayDate: string; // Grouping label (TODAY, YESTERDAY, etc.)
  fullDate: string; // Jan 11, 2026
  month: string; // January
  icon: keyof typeof Ionicons.glyphMap;
};

const CATEGORIES = ['All', 'Food', 'Transport', 'Utilities', 'Fun', 'Salary', 'Freelance', 'Invest', 'Gift', 'Savings', 'Shopping', 'Other'];
const MONTHS = ['All', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
  switch (category) {
    case 'Food': return 'fast-food-outline';
    case 'Transport': return 'car-sport-outline';
    case 'Utilities': return 'flash-outline';
    case 'Fun': return 'game-controller-outline';
    case 'Salary': return 'cash-outline';
    case 'Freelance': return 'briefcase-outline';
    case 'Invest': return 'trending-up-outline';
    case 'Gift': return 'gift-outline';
    case 'Savings': return 'stats-chart-outline';
    case 'Shopping': return 'bag-handle-outline';
    default: return 'cart-outline';
  }
};

export default function TransactionsScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { format } = useCurrency();

  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeMonth, setActiveMonth] = useState('All');
  const [activeType, setActiveType] = useState<'All' | 'income' | 'expense'>('All');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [])
  );

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped: Transaction[] = data.map((t: any) => {
          const tDate = new Date(t.date);
          const today = new Date();
          const yesterday = new Date();
          yesterday.setDate(today.getDate() - 1);

          let displayDate = tDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
          if (tDate.toDateString() === today.toDateString()) displayDate = 'TODAY';
          else if (tDate.toDateString() === yesterday.toDateString()) displayDate = 'YESTERDAY';

          return {
            id: t.id,
            amount: Number(t.amount),
            type: t.type,
            category: t.category,
            note: t.note || '',
            date: t.date,
            displayDate,
            fullDate: tDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
            month: tDate.toLocaleString('default', { month: 'long' }),
            icon: getCategoryIcon(t.category),
          };
        });
        setTxs(mapped);
      }
    } catch (error) {
      console.log('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const filteredData = useMemo(() => {
    return txs.filter((item) => {
      const matchesSearch = item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.note.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesMonth = activeMonth === 'All' || item.month === activeMonth;
      const matchesType = activeType === 'All' || item.type === activeType;
      return matchesSearch && matchesCategory && matchesMonth && matchesType;
    });
  }, [txs, searchQuery, activeCategory, activeMonth, activeType]);

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.bgDark]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.textWhite]}>History</Text>

        {/* 1. Search Bar */}
        <View style={[styles.searchContainer, isDark && styles.searchDark]}>
          <Ionicons name="search" size={18} color={isDark ? "#9E9E9E" : "#71717A"} />
          <TextInput
            placeholder="Search categories or notes..."
            placeholderTextColor={isDark ? "#666" : "#71717A"}
            style={[styles.searchInput, isDark && styles.textWhite]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* 2. Filters Row */}
        <View style={{ gap: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {MONTHS.map((m) => (
              <Pressable key={m} onPress={() => setActiveMonth(m)} style={[styles.monthPill, activeMonth === m && (isDark ? styles.activePillDark : styles.activePill)]}>
                <Text style={[styles.pillText, activeMonth === m && (isDark ? styles.textWhite : styles.activePillText)]}>{m}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {['All', 'income', 'expense'].map((type) => (
              <Pressable
                key={type}
                onPress={() => setActiveType(type as any)}
                style={[
                  styles.catPill,
                  isDark && styles.catPillDark,
                  activeType === type && (
                    type === 'income' ? styles.activeIncPill :
                      type === 'expense' ? styles.activeExpPill :
                        (isDark ? styles.activeCatPillDark : styles.activeCatPill)
                  )
                ]}
              >
                <Text style={[styles.catText, activeType === type && styles.activeCatText]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </Pressable>
            ))}
            <View style={styles.vDivider} />
            {CATEGORIES.map((cat) => (
              <Pressable key={cat} onPress={() => setActiveCategory(cat)} style={[styles.catPill, isDark && styles.catPillDark, activeCategory === cat && (isDark ? styles.activeCatPillDark : styles.activeCatPill)]}>
                <Text style={[styles.catText, activeCategory === cat && styles.activeCatText]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1A1A1A" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <View>
              {(index === 0 || filteredData[index - 1].displayDate !== item.displayDate) && (
                <Text style={styles.groupHeader}>{item.displayDate}</Text>
              )}
              <Pressable onPress={() => setSelectedTx(item)} style={[styles.item, isDark && styles.itemDark]}>
                <View style={[styles.iconBox, isDark && styles.iconBoxDark]}>
                  <Ionicons name={item.icon as any} size={20} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.merchant, isDark && styles.textWhite]}>{item.category}</Text>
                  <Text style={styles.category} numberOfLines={1}>{item.note || 'No note'}</Text>
                </View>
                <Text style={[styles.amount, item.type === 'income' ? styles.inflow : (isDark ? styles.textWhite : styles.outflow)]}>
                  {item.type === 'income' ? '+' : '-'}{format(item.amount)}
                </Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No transactions found.</Text>
            </View>
          }
        />
      )}

      {/* Transaction Detail Modal */}
      <Modal visible={!!selectedTx} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setSelectedTx(null)} />
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <View style={styles.modalHandle} />
            {selectedTx && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 24 }}>
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <View style={[styles.largeIcon, isDark && styles.iconBoxDark]}>
                      <Ionicons name={selectedTx.icon as any} size={32} color="#FFF" />
                    </View>
                    <Text style={[styles.modalMerchant, isDark && styles.textWhite]}>{selectedTx.category}</Text>
                    <Text style={[styles.modalAmount, selectedTx.type === 'income' ? styles.inflow : (isDark ? styles.textWhite : styles.outflow)]}>
                      {selectedTx.type === 'income' ? '+' : '-'}{format(selectedTx.amount)}
                    </Text>
                  </View>

                  <View style={[styles.infoCard, isDark && styles.infoCardDark]}>
                    <DetailRow label="Date" value={selectedTx.fullDate} isDark={isDark} />
                    <DetailRow label="Type" value={selectedTx.type.charAt(0).toUpperCase() + selectedTx.type.slice(1)} isDark={isDark} />
                    <DetailRow label="Category" value={selectedTx.category} isDark={isDark} />
                    <DetailRow label="Notes" value={selectedTx.note || 'None'} isDark={isDark} last />
                  </View>

                  <Pressable onPress={() => setSelectedTx(null)} style={[styles.closeBtn, isDark && styles.closeBtnDark]}>
                    <Text style={[styles.closeBtnText, isDark && styles.textBlack]}>Dismiss</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const DetailRow = ({ label, value, last, isDark }: { label: string; value: string; last?: boolean; isDark?: boolean }) => (
  <View style={[styles.detailRow, !last && styles.detailBorder, !last && isDark && styles.detailBorderDark]}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, isDark && styles.textWhite]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  bgDark: { backgroundColor: '#0F0F12' },
  header: { paddingHorizontal: 24, paddingTop: 10, gap: 16 },
  title: { color: '#1A1A1A', fontSize: 28, fontWeight: '700' },
  textWhite: { color: '#FFFFFF' },
  textBlack: { color: '#000' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 14, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#F0F0F0' },
  searchDark: { backgroundColor: '#1A1A1A', borderColor: '#333' },
  searchInput: { flex: 1, color: '#1A1A1A', marginLeft: 8 },
  filterScroll: { gap: 8 },
  monthPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderBottomWidth: 2, borderColor: 'transparent' },
  activePill: { borderColor: '#1A1A1A' },
  activePillDark: { borderColor: '#FFF' },
  pillText: { color: '#71717A', fontSize: 13, fontWeight: '600' },
  activePillText: { color: '#1A1A1A' },
  catPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#F0F0F0' },
  catPillDark: { backgroundColor: '#1A1A1A', borderColor: '#333' },
  activeCatPill: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  activeCatPillDark: { backgroundColor: '#333', borderColor: '#444' },
  activeIncPill: { backgroundColor: '#48BB78' },
  activeExpPill: { backgroundColor: '#F56565' },
  catText: { fontSize: 13, fontWeight: '600', color: '#9E9E9E' },
  activeCatText: { color: '#FFF' },
  listContent: { padding: 24, paddingBottom: 40 },
  groupHeader: { color: '#9E9E9E', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12, marginTop: 10 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, marginBottom: 8, borderWidth: 1, borderColor: '#F5F5F5' },
  itemDark: { backgroundColor: '#1A1A1A', borderColor: '#333' },
  iconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  iconBoxDark: { backgroundColor: '#333' },
  merchant: { color: '#1A1A1A', fontSize: 15, fontWeight: '600' },
  category: { color: '#71717A', fontSize: 12, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700' },
  inflow: { color: '#4CAF50' },
  outflow: { color: '#1A1A1A' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalContentDark: { backgroundColor: '#1A1A1A', borderTopWidth: 1, borderColor: '#333' },
  modalHandle: { width: 36, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  largeIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' },
  modalMerchant: { color: '#1A1A1A', fontSize: 24, fontWeight: '700' },
  modalAmount: { fontSize: 32, fontWeight: '800' },
  infoCard: { backgroundColor: '#FAFAFA', borderRadius: 24, borderWidth: 1, borderColor: '#F0F0F0', overflow: 'hidden' },
  infoCardDark: { backgroundColor: '#222', borderColor: '#333' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  detailBorder: { borderBottomWidth: 1, borderColor: '#F0F0F0' },
  detailBorderDark: { borderColor: '#333' },
  detailLabel: { color: '#71717A', fontSize: 14, fontWeight: '500' },
  detailValue: { color: '#1A1A1A', fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'right', marginLeft: 20 },
  closeBtn: { backgroundColor: '#1A1A1A', padding: 18, borderRadius: 18, alignItems: 'center' },
  closeBtnDark: { backgroundColor: '#FFF' },
  closeBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#9E9E9E', fontSize: 15 },
  vDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
    alignSelf: 'center',
    opacity: 0.6
  }
});
