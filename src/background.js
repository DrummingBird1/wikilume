/* WikiLume – background service worker. Its only job is the "toggle reader" keyboard command; it holds no state and makes no
   requests. The content script on the active tab does the work. */
chrome.commands.onCommand.addListener((command) => {
  if (command !== 'toggle-reader') return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || tab.id == null) return;
    // pages without our content script have no receiver: ignore that error
    chrome.tabs.sendMessage(tab.id, { type: 'wf-toggle' }, () => void chrome.runtime.lastError);
  });
});
