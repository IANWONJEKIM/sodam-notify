import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['web/src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, SODAM_CFG: 'readonly' },
    },
    rules: {
      // 원래 코드 스타일(짧은 회로 평가로 쓰는 식) 그대로 둬요
      'no-unused-expressions': 'off',
      'no-empty': 'off',
      'no-unused-vars': ['warn', { args: 'none' }],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node } },
  },
];
