module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((react-native.*|@react-native.*|expo.*|@expo.*|react-navigation.*|@react-navigation.*|@unimodules.*|unimodules.*|native-base.*|react-native-svg)))/',
  ],
  setupFilesAfterEnv: ['@testing-library/react-native/extend-expect'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
