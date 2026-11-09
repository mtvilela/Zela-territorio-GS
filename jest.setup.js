/* global jest */
// Preparação dos testes: troca o armazenamento do aparelho por uma versão em memória,
// para as lojas persistidas (Zustand + AsyncStorage) funcionarem dentro do Jest.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// O Zustand consulta `localStorage` ao criar uma loja persistida (é o armazenamento padrão dele,
// que não usamos). No Node 25+, só essa consulta já imprime um aviso; aqui ela vira "indefinido",
// como em um celular, e a saída dos testes fica limpa.
Object.defineProperty(globalThis, 'localStorage', { value: undefined, writable: true, configurable: true });
