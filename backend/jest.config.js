export default {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.js"],
  transform: {},
  // We use Node's experimental VM modules for ESM support in Jest
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  testMatch: ["**/tests/**/*.test.js"],
  // MongoMemoryServer downloads binary on first run — needs a longer timeout
  testTimeout: 30000,
  collectCoverageFrom: [
    "src/controllers/**/*.js",
    "src/middlewares/**/*.js",
    "src/services/**/*.js",
    "src/jobs/**/*.js"
  ],
  coverageDirectory: "coverage",
  verbose: true,
  // We mock external dependencies so we don't accidentally broadcast/write to DBs
  modulePathIgnorePatterns: ["<rootDir>/node_modules/"],
  clearMocks: true
};
