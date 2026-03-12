import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const MOCK_ACTIVITY = {
  groceries: {
    label: 'Local market',
    amount: '- €82.40',
    time: 'Today · Groceries',
    delta: '2.3% under trend',
    description: 'Fresh fruit, veg, and cupboard staples from your local Irish market.',
  },
  transport: {
    label: 'Luas & Dublin Bus',
    amount: '- €19.60',
    time: 'Yesterday · Transport',
    delta: '1 trip above plan',
    description: 'Commute and errands across Dublin on Luas and Dublin Bus.',
  },
  coffee: {
    label: 'Coffee & pastry',
    amount: '- €6.80',
    time: 'Yesterday · Eating out',
    delta: 'On schedule',
    description: 'A quick coffee stop in town, perfectly within your “treats” budget.',
  },
} as const;

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = (id && MOCK_ACTIVITY[id as keyof typeof MOCK_ACTIVITY]) ?? MOCK_ACTIVITY.groceries;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>{'‹ Back'}</Text>
        </Pressable>

        <Text style={styles.label}>{data.label}</Text>
        <Text style={styles.amount}>{data.amount}</Text>
        <Text style={styles.time}>{data.time}</Text>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Impact on budget</Text>
          <Text style={styles.cardBody}>{data.delta}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Details</Text>
          <Text style={styles.cardBody}>{data.description}</Text>
        </View>
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
  back: {
    color: '#8A8F9E',
    fontSize: 14,
  },
  label: {
    color: '#F5F7FB',
    fontSize: 22,
    fontWeight: '700',
  },
  amount: {
    color: '#F5F7FB',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  time: {
    color: '#7E8296',
    fontSize: 14,
  },
  card: {
    marginTop: 12,
    backgroundColor: '#0B0B12',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E1E2A',
    gap: 6,
  },
  cardHeading: {
    color: '#C4C9DA',
    fontSize: 15,
    fontWeight: '600',
  },
  cardBody: {
    color: '#7E8296',
    fontSize: 14,
  },
});


