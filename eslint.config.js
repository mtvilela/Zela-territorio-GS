// Configuração do ESLint (formato "flat"), usando as regras oficiais do Expo.
// Rodar com: npm run lint
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([globalIgnores(['dist/*', '.expo/*']), expoConfig]);
