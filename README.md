# Budget Tracker Mobile App

A React Native Expo mobile app for tracking your income and expenses.

## Features

- 📊 Dashboard with balance overview
- ➕ Add income and expense transactions
- 📝 View transaction history
- 🗑️ Delete transactions (long press)
- 💾 Local data persistence with AsyncStorage
- 🎨 Modern, clean UI

## Getting Started

### Prerequisites

- Node.js installed
- Expo CLI installed globally: `npm install -g expo-cli`
- Expo Go app on your mobile device (iOS or Android)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the Expo development server:
```bash
npm start
```

3. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

## Project Structure

```
BudgetTracker/
├── App.js                 # Main app component with navigation
├── screens/
│   ├── HomeScreen.js      # Dashboard with balance and recent transactions
│   ├── AddTransactionScreen.js  # Form to add new transactions
│   └── HistoryScreen.js   # Full transaction history with filters
├── utils/
│   └── storage.js         # AsyncStorage utilities for data persistence
└── package.json
```

## Usage

1. **Dashboard (Home)**: View your current balance, total income, total expenses, and recent transactions
2. **Add Transaction**: Tap the "+" tab to add income or expense transactions
3. **History**: View all transactions, filter by type, and delete transactions by long pressing

## Technologies Used

- React Native
- Expo
- React Navigation (Bottom Tabs)
- AsyncStorage for local data persistence
- Expo Linear Gradient

## Future Enhancements

- Categories with icons
- Budget limits and alerts
- Charts and graphs
- Export to CSV
- Multiple accounts/wallets
- Recurring transactions

