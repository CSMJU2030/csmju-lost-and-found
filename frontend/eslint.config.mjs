// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'src/types/api.d.ts'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { window: 'readonly', document: 'readonly', navigator: 'readonly', console: 'readonly', process: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // try { localStorage/sessionStorage } catch {} — เบราว์เซอร์บางตัวปิด storage ไว้ ไม่ต้องทำอะไร
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
);
