const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('joblessPlatform', {
  platform: 'steam',
});
