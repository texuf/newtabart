// Cross-browser compatibility polyfill
// This ensures the extension works in both Chrome and Firefox
if (typeof browser === "undefined") {
  // Chrome doesn't have the 'browser' object, so we create it from 'chrome'
  var browser = chrome;
}