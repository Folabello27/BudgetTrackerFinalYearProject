import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

type AuthPrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function AuthPrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: AuthPrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        pressed && !isDisabled ? styles.buttonPressed : null,
        isDisabled ? styles.buttonDisabled : null,
      ]}>
      {loading ? (
        <ActivityIndicator color="#050505" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#F7F8FA',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  label: {
    color: '#050505',
    fontSize: 16,
    fontWeight: '700',
  },
});


