// Background script (Service Worker)
console.log('Background script loaded!');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});