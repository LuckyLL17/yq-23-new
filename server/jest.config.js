module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 30000,
  transformIgnorePatterns: [
    'node_modules/(?!(lowdb|steno)/)',
  ],
  moduleNameMapper: {
    '^lowdb/node$': '<rootDir>/node_modules/lowdb/lib/node.js',
  },
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': 'ts-jest',
  },
};
