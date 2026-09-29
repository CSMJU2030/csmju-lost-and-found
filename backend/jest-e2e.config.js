/** E2E: แอป Nest ทั้งตัว + Core Hub ปลอม (JWKS) + PostgreSQL จริง (schema ชั่วคราวต่อไฟล์) */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: 'test/.*\.e2e-spec\.ts$',
  transform: { '^.+\.(t|j)s$': 'ts-jest' },
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  setupFiles: ['<rootDir>/test/e2e-setup.ts'],
  testTimeout: 30000,
};
