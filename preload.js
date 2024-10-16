const { contextBridge, ipcRenderer } = require('electron');

// Expose APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  getAppPath: () => ipcRenderer.invoke('getAppPath'),
  openAuthWindow: (authUrl) => ipcRenderer.send('open-auth-window', authUrl),
  onOAuthCallback: (authUrl) => ipcRenderer.send('open-auth-window', authUrl),  
  // Expose other ipcRenderer methods if needed
  sendMessage: (channel, data) => {
    // Whitelist channels to avoid security risks
    const validChannels = ["your-channel-name"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  onMessage: (channel, func) => {
    const validChannels = ["your-channel-name"];
    if (validChannels.includes(channel)) {
      // Strip off the 'on' prefix and use it as an event listener
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});
