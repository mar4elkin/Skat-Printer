chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.openOrderPage) {
    chrome.tabs.onRemoved.addListener((removedTabId => {
      if (removedTabId == message.createdTab.id) {
        chrome.tabs.create({url: message.url});
      }
    }));
  }
});