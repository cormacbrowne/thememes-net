import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['playwright.config.js', 'tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    // Specs must use the storage stub, or they download live Supabase media (egress cap).
    files: ['tests/**/*.spec.js'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: '@playwright/test',
          importNames: ['test'],
          message: "Import test from './storageStub.js' so live Supabase Storage is never downloaded.",
        }],
      }],
    },
  },
])
