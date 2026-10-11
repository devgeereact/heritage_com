import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

// The app is plain JavaScript (src/ is .js/.jsx, zero .ts), so this lints JS
// and JSX. The old config matched only **/*.{ts,tsx}, which meant `npm run lint`
// passed while applying no rules to any file. typescript-eslint stays installed
// but is not used here; bring it back if the project ever moves to TypeScript.
export default [
  { ignores: ['dist', 'node_modules'] },

  // Browser app code.
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Core no-unused-vars cannot see JSX usage (<Card /> does not count as a
      // reference without eslint-plugin-react, which is not installed), so every
      // imported component reads as unused. Ignoring capitalised names is the
      // create-vite React JS template's answer; lower-case unused vars still error.
      // ignoreRestSiblings allows `const { className, ...other } = props`, used to
      // keep a prop out of a spread on purpose (SelectFormInput, roles.js).
      'no-unused-vars': [
        'error',
        { varsIgnorePattern: '^[A-Z_]', ignoreRestSiblings: true },
      ],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },

  // Service worker: runs in the worker scope (self, caches, clients), not the window.
  {
    files: ['public/sw.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: globals.serviceworker,
    },
    rules: js.configs.recommended.rules,
  },

  // Root tooling config files (vite.config.js, this file) run under Node.
  {
    files: ['*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: js.configs.recommended.rules,
  },
]
