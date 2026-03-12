import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

type AuthFormFieldProps = TextInputProps & {
  label: string;
  errorMessage?: string;
  secure?: boolean;
  hint?: string;
};

export function AuthFormField({
  label,
  errorMessage,
  secure,
  hint,
  style,
  ...textInputProps
}: AuthFormFieldProps) {
  const [secureVisible, setSecureVisible] = useState<boolean>(false);
  const showToggle = secure;

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.placeholderHint}>{hint}</Text> : null}
      </View>
      <View style={styles.inputWrapper}>
        <TextInput
          placeholderTextColor="#5E6270"
          {...textInputProps}
          style={[styles.input, style]}
          secureTextEntry={secure ? !secureVisible : false}
        />
        {showToggle ? (
          <Pressable
            accessibilityLabel={secureVisible ? 'Hide password' : 'Show password'}
            onPress={() => setSecureVisible((prev) => !prev)}
            hitSlop={12}
            style={styles.toggle}>
            <Ionicons
              name={secureVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#9AA0B3"
            />
          </Pressable>
        ) : null}
      </View>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#E2E6F2',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  placeholderHint: {
    color: '#6B6F80',
    fontSize: 12,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#0B0B12',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#1E1E2A',
    color: '#F5F7FB',
    fontSize: 16,
  },
  toggle: {
    position: 'absolute',
    right: 14,
    top: '50%',
    marginTop: -12,
  },
  error: {
    color: '#FF8A8A',
    fontSize: 12,
  },
});


