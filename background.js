// Use cross-browser API
const browserAPI = (typeof browser !== 'undefined') ? browser : chrome;

browserAPI.browserAction.onClicked.addListener(function()
{
    browserAPI.tabs.create({ 'url': browserAPI.runtime.getURL("newpage.html") });
});