# Budget Tracker Pro

A polished Expo-based budgeting application designed to look and behave like a stronger final-year software project. The app combines a modern mobile UI with modular services, analytics, notifications, authentication, and test-ready project structure.

## What this version improves
- Stronger project presentation for assessment and demo purposes
- Clearer release tracking and product documentation
- Better service separation for insights, alerts, exports, and release notes
- Automated test scaffolding and CI-ready workflow support

## Core features
- Transaction tracking for income and expenses
- Budget monitoring and alerting
- Savings goals and subscription insights
- Smart insights and export support
- Secure authentication and biometric access
- Admin-aware profile and notifications experience

## Architecture highlights
- Expo Router for screen navigation
- Supabase for data persistence and authentication
- AsyncStorage for local persistence and offline-friendly state
- Modular services in the lib folder for maintainability
- Jest and React Native Testing Library for automated validation

## Getting started
1. Install dependencies:
   ```bash
   npm install --force
   ```
2. Configure your environment variables:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. Start the app:
   ```bash
   npx expo start --clear
   ```

## Quality and delivery
- Automated tests: npm test
- Linting: npm run lint
- CI workflow: .github/workflows/ci.yml

## Release notes
See CHANGELOG.md for the upgrade history and current project milestones.
