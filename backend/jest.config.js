module.exports = {
  testEnvironment: "node",
  testMatch: ["**/*.test.js"],
  collectCoverageFrom: ["controllers/**/*.js"],
  verbose: true,
  testTimeout: 10000,
};