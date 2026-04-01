import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENCY_CACHE_KEY = 'currency_cache';
const USER_CURRENCY_KEY = 'user_currency';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'NGN' | 'INR';

export const CURRENCIES: { code: CurrencyCode; symbol: string; name: string; flag: string }[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
];

interface ExchangeRateCache {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

class CurrencyService {
  private apiUrl = 'https://api.exchangerate-api.com/v4/latest';

  async getExchangeRates(base: string = 'USD'): Promise<Record<string, number> | null> {
    try {
      // Check cache first
      const cached = await this.getCachedRates();
      if (cached && cached.base === base && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.rates;
      }

      // Fetch fresh rates
      const response = await fetch(`${this.apiUrl}/${base}`);
      if (!response.ok) throw new Error('Failed to fetch rates');

      const data = await response.json();
      const rates = data.rates as Record<string, number>;

      // Cache the result
      await this.cacheRates({ base, rates, timestamp: Date.now() });

      return rates;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      // Return cached rates even if expired
      const cached = await this.getCachedRates();
      return cached?.rates || null;
    }
  }

  async convert(
    amount: number,
    from: CurrencyCode,
    to: CurrencyCode
  ): Promise<number | null> {
    if (from === to) return amount;

    const rates = await this.getExchangeRates(from);
    if (!rates || !rates[to]) return null;

    return amount * rates[to];
  }

  async getUserCurrency(): Promise<CurrencyCode> {
    try {
      const currency = await AsyncStorage.getItem(USER_CURRENCY_KEY);
      return (currency as CurrencyCode) || 'USD';
    } catch {
      return 'USD';
    }
  }

  async setUserCurrency(currency: CurrencyCode): Promise<void> {
    await AsyncStorage.setItem(USER_CURRENCY_KEY, currency);
  }

  formatAmount(amount: number, currency: CurrencyCode): string {
    const currencyInfo = CURRENCIES.find(c => c.code === currency);
    const symbol = currencyInfo?.symbol || '$';

    return `${symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  private async getCachedRates(): Promise<ExchangeRateCache | null> {
    try {
      const data = await AsyncStorage.getItem(CURRENCY_CACHE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private async cacheRates(cache: ExchangeRateCache): Promise<void> {
    await AsyncStorage.setItem(CURRENCY_CACHE_KEY, JSON.stringify(cache));
  }

  // Get conversion rate between two currencies
  async getRate(from: CurrencyCode, to: CurrencyCode): Promise<number | null> {
    if (from === to) return 1;

    const rates = await this.getExchangeRates(from);
    return rates?.[to] || null;
  }
}

export const currencyService = new CurrencyService();
