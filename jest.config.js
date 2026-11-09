// Testes unitários com Jest + preset do Expo.
// Rodar com: npm test
module.exports = {
  preset: 'jest-expo',
  // Só os testes do nosso código (ignora node_modules e builds).
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts', '<rootDir>/src/**/__tests__/**/*.test.tsx'],
  // Armazenamento em memória no lugar do AsyncStorage real.
  setupFiles: ['<rootDir>/jest.setup.js'],
  // O alias "@/..." do tsconfig aponta para a pasta src.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
