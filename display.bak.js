const { app, BrowserWindow } = require('electron');

let win;

function createWindow(data) {
  win = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadURL(`data:text/html;charset=utf-8,
    <html>
    <body>
      <h1>Google Sheets Data</h1>
      <p>${data}</p>
      <button onclick="window.close()">Close</button>
    </body>
    </html>`);

  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(() => {
  const data = process.argv[2]; // Get the passed data from main process
  createWindow(data);

  app.on('activate', () => {
    if (win === null) createWindow(data);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

