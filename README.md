# Budget Tracker Pro

A comprehensive cross-platform mobile budgeting application built with React Native and Expo, featuring advanced analytics, offline capabilities, and multi-currency support.

---

## Author

**Raheem Folarin**  
BSc Computing  
Dorset College, Dublin

---

## Features

### Core Functionality
- **Transaction Management** - Track income and expenses with categorized transactions
- **Budget Planning** - Set and monitor monthly budgets with spending limits
- **Smart Insights** - AI-powered financial analysis with spending patterns and recommendations
- **Data Export** - Export transaction data to CSV and PDF formats
- **Biometric Authentication** - Secure app access with fingerprint/face recognition
- **Push Notifications** - Real-time budget alerts and spending notifications

### Advanced Features
- **Offline Mode** - Full functionality without internet; automatic sync when reconnected
- **Multi-Currency Support** - Support for 15+ currencies with real-time exchange rates
- **Dark/Light Theme** - Customizable UI themes with system preference detection
- **Financial Health Score** - Comprehensive financial wellness analytics
- **Spending Forecasting** - Predictive analytics for future spending patterns

### Admin Dashboard
- **User Management** - View and manage all application users
- **Audit Logs** - Complete activity tracking with timestamps and user actions
- **System Analytics** - Platform-wide transaction and user statistics
- **Role-Based Access** - Admin and standard user permission levels

### Testing & DevOps
- **Unit Testing** - Jest and React Native Testing Library setup
- **CI/CD Pipeline** - GitHub Actions workflow for automated testing

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React Native 0.81.5 + Expo SDK 54 |
| Language | TypeScript |
| Backend | Supabase (PostgreSQL + Auth) |
| Storage | AsyncStorage (local), Supabase (cloud) |
| Navigation | Expo Router |
| UI | React Native + Custom Components |
| Animations | React Native Reanimated |
| Testing | Jest + React Native Testing Library |
| CI/CD | GitHub Actions |

---

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Expo Go app (iOS/Android) or emulator

### Installation

1. Clone the repository and navigate to the project:
```bash
cd Project
```

2. Install dependencies:
```bash
npm install --force
```

3. Configure environment variables:
Create a `.env` file in the root directory with:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npx expo start --clear
```

5. Run on your device:
   - Scan the QR code with Expo Go (Android)
   - Scan the QR code with Camera app (iOS)
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator

---

## Project Structure

```
Project/
├── app/                    # Main application screens (Expo Router)
│   ├── (tabs)/            # Tab navigation screens
│   ├── _layout.tsx        # Root layout configuration
│   └── ...
├── components/            # Reusable UI components
├── lib/                   # Core business logic & services
│   ├── supabase.ts       # Database client
│   ├── offline.ts        # Offline sync engine
│   ├── currency.ts       # Currency conversion service
│   └── ...
├── hooks/                 # Custom React hooks
├── __tests__/            # Unit tests
└── docs/                 # Documentation
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo development server |
| `npm run android` | Start on Android emulator |
| `npm run ios` | Start on iOS simulator |
| `npm run web` | Start web version |
| `npm test` | Run Jest unit tests |
| `npm run lint` | Run ESLint code checks |

---

## Key Dependencies

- **expo** ~54.0.25
- **react-native** 0.81.5
- **react** 19.1.0
- **supabase-js** ^2.86.0
- **@react-native-async-storage/async-storage** ^2.2.0
- **expo-local-authentication** ^17.0.8
- **expo-notifications** ^0.32.16

---

## License

This project was developed as part of the BSc Computing program at Dorset College, Dublin.

---

## Acknowledgments

- [Expo](https://expo.dev/) for the cross-platform development framework
- [Supabase](https://supabase.com/) for backend infrastructure
- [React Native](https://reactnative.dev/) for the mobile development platform
