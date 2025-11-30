// ESLint v9 Flat Config
const js = require('@eslint/js');
const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  // Ignore common folders
  { ignores: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', 'src/**/*.old.tsx'] },

  // Base JS recommended
  js.configs.recommended,

  // TS/React rules for our src
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react,
      'react-hooks': reactHooks,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // React
      ...(react.configs.recommended?.rules || {}),
      'react/react-in-jsx-scope': 'off',
      'react/no-unescaped-entities': 'off',

      // React Hooks
  'react-hooks/rules-of-hooks': 'off',
  'react-hooks/exhaustive-deps': 'off',

      // Project style
  'max-lines': 'off',
  'max-lines-per-function': 'off',

      // TS-friendly adjustments
      'no-undef': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-useless-escape': 'off',
    },
  },

  // Per-file overrides (flat config style): disable max-lines for large Job page
  {
    files: ['src/app/routes/Job/index.tsx'],
    rules: {
      'max-lines': 'off',
    },
  },
];
