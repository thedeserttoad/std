const path = require('path');
const expressApp = require('./app');  // This is your Express app exported from app.js
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); // Import uuid for unique identifiers

let mainWindow;
let authWindow;



// Function to create a new BrowserWindow instance
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 750,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load your Express app in the Electron window
  mainWindow.loadURL(`http://localhost:${serverPort}`);
  expressApp.set('mainWindow', mainWindow);
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}


function createAuthWindow(authUrl) {
  console.log('Creating auth window with URL:', authUrl);

  authWindow = new BrowserWindow({
    width: 500,
    height: 600,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true // Enable devTools so you can manually open it
    },
  });

  // Load the auth URL
  authWindow.loadURL(authUrl);

  // Handle the OAuth2 callback here
  authWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http://localhost:3000/oauth2callback')) {
      // Send the callback URL back to the renderer process
      mainWindow.webContents.send('oauth-callback', url);

      // Close the auth window
      authWindow.close();
    }
  });

  ipcMain.on('oauth-success', (event, tokens) => {
    // Close the auth window after receiving the tokens
    if (authWindow) {
      authWindow.close();
    }
  });
}

// Called when Electron has finished initialization
app.whenReady().then(createWindow);

// Start the Express server
const serverPort = 3000;
expressApp.listen(serverPort, () => {
  console.log(`Express server running on http://localhost:${serverPort}`);
});

// IPC listener to open the auth window
ipcMain.on('open-auth-window', (event, authUrl) => {
  console.log('Received open-auth-window event with URL:', authUrl);  // Log to verify the event
  createAuthWindow(authUrl);
});

// Listener for receiving tokens from the renderer process after OAuth authentication
ipcMain.on('oauth-success', (event, tokens) => {
  console.log('Tokens received from OAuth callback:', tokens);
  // You can store tokens here or use them directly as needed
});

ipcMain.handle('print-label', async (event, pdfData) => {
  try {
    // Generate a unique temporary file path
    const tempFilePath = path.join(app.getPath('temp'), `label_${uuidv4()}.pdf`);

    // Write the buffer to a file
    fs.writeFileSync(tempFilePath, Buffer.from(pdfData));

    // Open the PDF in the default browser
    shell.openExternal(`file://${tempFilePath}`);
  } catch (err) {
    console.error('Error printing label:', err);
  }
});


// Quit the app when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Re-create a window when the app is activated (macOS specific behavior)
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
