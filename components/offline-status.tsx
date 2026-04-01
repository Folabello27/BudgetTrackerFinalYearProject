import { useOfflineStatus } from '@/hooks/use-offline';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface OfflineStatusProps {
  showDetails?: boolean;
}

export function OfflineStatus({ showDetails = false }: OfflineStatusProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isOnline, syncStatus, pendingCount, isLoading, syncNow } = useOfflineStatus();

  if (isOnline && pendingCount === 0) {
    return null; // Don't show anything when online with no pending
  }

  const bgColor = isOnline ? (isDark ? '#14532d' : '#dcfce7') : (isDark ? '#451a1a' : '#fee2e2');
  const textColor = isOnline ? (isDark ? '#86efac' : '#16a34a') : (isDark ? '#fca5a5' : '#dc2626');
  const iconName = isOnline ? 'cloud-done-outline' : 'cloud-offline-outline';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.row}>
        <Ionicons name={iconName as any} size={16} color={textColor} />
        <Text style={[styles.text, { color: textColor }]}>
          {isOnline 
            ? `Sync: ${pendingCount} pending` 
            : 'Offline mode'
          }
        </Text>
        {isOnline && pendingCount > 0 && (
          <Pressable onPress={syncNow} disabled={isLoading} style={styles.syncButton}>
            {isLoading ? (
              <ActivityIndicator size="small" color={textColor} />
            ) : (
              <Ionicons name="sync-outline" size={16} color={textColor} />
            )}
          </Pressable>
        )}
      </View>

      {showDetails && syncStatus?.lastError && (
        <Text style={[styles.errorText, { color: textColor }]}>
          {syncStatus.lastError}
        </Text>
      )}

      {showDetails && syncStatus?.lastSync && (
        <Text style={[styles.detailText, { color: textColor }]}>
          Last sync: {new Date(syncStatus.lastSync).toLocaleString()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  syncButton: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  detailText: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.8,
  },
});
