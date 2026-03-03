module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 15000,
  setupFiles: ['./tests/setup.js'],
  forceExit: true,  // close open DB pool handles after all tests complete
};
