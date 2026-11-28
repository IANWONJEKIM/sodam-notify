import { defineConfig } from 'vitest/config';

// 보안 규칙 테스트 · npm run test:rules 로 에뮬레이터를 켠 채 돌아가요
export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    testTimeout: 15000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
