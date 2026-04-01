import { useCurrency } from '@/hooks/use-currency';
import { useTheme } from '@/lib/theme-context';
import { CurrencyCode } from '@/lib/currency';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface CurrencySelectorProps {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
}

export function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currencies } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);

  const selected = currencies.find(c => c.code === value);

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        style={[
          styles.button,
          { backgroundColor: isDark ? '#27272a' : '#fff', borderColor: isDark ? '#3f3f46' : '#e4e4e7' }
        ]}
      >
        <Text style={styles.flag}>{selected?.flag}</Text>
        <Text style={[styles.code, { color: isDark ? '#fafafa' : '#18181b' }]}>
          {selected?.code}
        </Text>
        <Text style={[styles.name, { color: isDark ? '#a1a1aa' : '#71717a' }]}>
          {selected?.name}
        </Text>
        <Ionicons name="chevron-down" size={16} color={isDark ? '#71717a' : '#a1a1aa'} />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#18181b' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#fafafa' : '#18181b' }]}>
                Select Currency
              </Text>
              <Pressable onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#71717a' : '#71717a'} />
              </Pressable>
            </View>

            <ScrollView style={styles.currencyList}>
              {currencies.map(currency => (
                <Pressable
                  key={currency.code}
                  onPress={() => {
                    onChange(currency.code);
                    setIsOpen(false);
                  }}
                  style={[
                    styles.currencyItem,
                    value === currency.code && { backgroundColor: isDark ? '#27272a' : '#f4f4f5' }
                  ]}
                >
                  <Text style={styles.flag}>{currency.flag}</Text>
                  <View style={styles.currencyInfo}>
                    <Text style={[styles.currencyCode, { color: isDark ? '#fafafa' : '#18181b' }]}>
                      {currency.code}
                    </Text>
                    <Text style={[styles.currencyName, { color: isDark ? '#a1a1aa' : '#71717a' }]}>
                      {currency.name}
                    </Text>
                  </View>
                  {value === currency.code && (
                    <Ionicons name="checkmark" size={20} color={isDark ? '#fff' : '#18181b'} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  flag: {
    fontSize: 20,
  },
  code: {
    fontSize: 14,
    fontWeight: '600',
  },
  name: {
    fontSize: 13,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  currencyList: {
    paddingHorizontal: 20,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  currencyName: {
    fontSize: 13,
    marginTop: 2,
  },
});
