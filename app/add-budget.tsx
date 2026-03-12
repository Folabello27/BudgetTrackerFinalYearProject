import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function AddBudgetScreen() {
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [period, setPeriod] = useState('Monthly');

  const handleSave = () => {
    // Later: save to Supabase then go back
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Add budget</Text>
        <Text style={styles.subtitle}>Create a new euro budget for your life in Ireland.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Groceries"
            placeholderTextColor="#5E6270"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Limit (EUR)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="e.g. 300"
            placeholderTextColor="#5E6270"
            value={limit}
            onChangeText={setLimit}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Period</Text>
          <Text style={styles.period}>{period}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
          onPress={handleSave}
          disabled={!name || !limit}>
          <Text style={styles.buttonLabel}>Save budget</Text>
        </Pressable>

        <Pressable style={styles.cancel} onPress={() => router.back()}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050505',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    color: '#F5F7FB',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#8A8F9E',
    fontSize: 14,
  },
  field: {
    marginTop: 12,
    gap: 6,
  },
  label: {
    color: '#C4C9DA',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0B0B12',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#1E1E2A',
    color: '#F5F7FB',
    fontSize: 16,
  },
  period: {
    color: '#F5F7FB',
    fontSize: 16,
  },
  button: {
    marginTop: 24,
    backgroundColor: '#F7F8FA',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonLabel: {
    color: '#050505',
    fontSize: 16,
    fontWeight: '700',
  },
  cancel: {
    marginTop: 12,
    alignItems: 'center',
  },
  cancelLabel: {
    color: '#8A8F9E',
    fontSize: 14,
  },
});


