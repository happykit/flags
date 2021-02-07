// This polyfill is necessary until tsdx upgrades to the latest jest and jsdom
// https://github.com/testing-library/dom-testing-library/releases/tag/v7.0.0
if (typeof window !== "undefined")
  window.MutationObserver = require("@sheerun/mutationobserver-shim");
