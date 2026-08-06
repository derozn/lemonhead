import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

import noPenceArithmetic from './tools/eslint/no-pence-arithmetic.mjs';

export default tseslint.config(
  { ignores: ['**/node_modules', '**/dist', '**/.next', '**/coverage'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { 'import-x': importX },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'separate-type-imports' },
      ],
      'import-x/order': ['error', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // docs/standards.md: React hooks and accessibility rules for the web app.
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },
  {
    // Design doc §2: schemas imports nothing from the workspace.
    files: ['packages/schemas/src/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@lemonhead/*'],
              message: 'packages/schemas imports nothing from the workspace (design doc §2).',
            },
          ],
        },
      ],
    },
  },
  {
    // Design doc §2/§4.4: the entitlements engine is pure. It imports only
    // schemas, performs no IO, reads no clock, and uses no randomness.
    files: ['packages/entitlements/src/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@lemonhead/*', '!@lemonhead/schemas'],
              message: 'packages/entitlements imports only @lemonhead/schemas (design doc §2).',
            },
            {
              group: ['node:*'],
              message: 'The entitlements engine performs no IO (design doc §4.4).',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'The engine reads no clock: take asOfDate as an input (design doc §4.4).',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'The engine reads no clock: take asOfDate as an input (design doc §4.4).',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'The engine is deterministic: no randomness (design doc §4.4).',
        },
      ],
    },
  },
  {
    // ADR 0008: the engine emits pence, the UI formats pounds. Pence scaling
    // happens only in money.ts; pounds rendering only in the web formatter.
    files: ['**/*.{ts,tsx}'],
    ignores: ['packages/entitlements/src/money.ts', 'apps/web/src/lib/format.ts'],
    plugins: { lemonhead: { rules: { 'no-pence-arithmetic': noPenceArithmetic } } },
    rules: { 'lemonhead/no-pence-arithmetic': 'error' },
  },
  {
    // ADR 0007: UC money figures are memory-only. src/lib/storage.ts is the
    // single persistence choke point (it strips them); its test reads the raw
    // store on purpose, to prove the stripping without trusting storage.ts.
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/lib/storage.ts', 'apps/web/src/lib/storage.test.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message: 'Persist through src/lib/storage.ts only (ADR 0007: UC figures never persist).',
        },
        {
          name: 'sessionStorage',
          message: 'Persist through src/lib/storage.ts only (ADR 0007: UC figures never persist).',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'localStorage',
          message: 'Persist through src/lib/storage.ts only (ADR 0007: UC figures never persist).',
        },
        {
          object: 'window',
          property: 'sessionStorage',
          message: 'Persist through src/lib/storage.ts only (ADR 0007: UC figures never persist).',
        },
        {
          object: 'globalThis',
          property: 'localStorage',
          message: 'Persist through src/lib/storage.ts only (ADR 0007: UC figures never persist).',
        },
        {
          object: 'globalThis',
          property: 'sessionStorage',
          message: 'Persist through src/lib/storage.ts only (ADR 0007: UC figures never persist).',
        },
        {
          object: 'document',
          property: 'cookie',
          message: 'Persist through src/lib/storage.ts only (ADR 0007: UC figures never persist).',
        },
      ],
    },
  },
  { files: ['**/*.{js,mjs}'], ...tseslint.configs.disableTypeChecked },
  prettier,
);
