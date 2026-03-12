import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIometric_ENABLED_KEY = 'biometric_enabled';
const USER_CREDENTIALS_KEY = 'user_credentials';

export const BiometricService = {
    async isSupported() {
        return await LocalAuthentication.hasHardwareAsync();
    },

    async isEnrolled() {
        return await LocalAuthentication.isEnrolledAsync();
    },

    async setBiometricEnabled(enabled: boolean) {
        await AsyncStorage.setItem(BIometric_ENABLED_KEY, JSON.stringify(enabled));
        if (!enabled) {
            await SecureStore.deleteItemAsync(USER_CREDENTIALS_KEY);
        }
    },

    async isBiometricEnabled() {
        const val = await AsyncStorage.getItem(BIometric_ENABLED_KEY);
        return val ? JSON.parse(val) : false;
    },

    async saveCredentials(email: string, pass: string) {
        const isBioEnabled = await this.isBiometricEnabled();
        if (isBioEnabled) {
            await SecureStore.setItemAsync(USER_CREDENTIALS_KEY, JSON.stringify({ email, pass }));
        }
    },

    async getCredentials() {
        const creds = await SecureStore.getItemAsync(USER_CREDENTIALS_KEY);
        return creds ? JSON.parse(creds) : null;
    },

    async authenticate() {
        const isSupported = await this.isSupported();
        if (!isSupported) {
            return false;
        }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate to sign in',
            fallbackLabel: 'Enter Password',
            disableDeviceFallback: false,
        });

        return result.success;
    },

    async getBiometricType() {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            return 'FaceID';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            return 'Fingerprint';
        }
        // Fallback for iOS detection if types array is limited
        if (Platform.OS === 'ios') return 'FaceID';
        return 'Biometrics';
    }
};
