const path = require('path');

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: path.join(__dirname, 'tsconfig.json'),
    tsconfigRootDir: __dirname,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  env: {
    node: true,
    es2022: true
  },
  ignorePatterns: [
    'out/',
    'node_modules/',
    '.vscode-test/',
    'media/'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-var-requires': 'warn',
    'no-constant-condition': 'warn',
    'no-empty': 'warn',
    'prefer-const': 'warn'
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/test/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off'
      }
    }
  ]
};
