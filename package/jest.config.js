/** @typedef {import('ts-jest/dist/types')} */
/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // automock: false,
  setupFiles: ["./jest/mutation-observer.js"],
};
