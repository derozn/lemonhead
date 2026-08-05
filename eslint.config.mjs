import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

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
  { files: ['**/*.{js,mjs}'], ...tseslint.configs.disableTypeChecked },
  prettier,
);
