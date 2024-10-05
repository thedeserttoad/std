const express = require('express');
const path = require('path');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const { app: electronApp } = require('electron'); // Import the Electron app instance
const tokensPath = path.join(electronApp.getPath('userData'), 'tokens.json');

const { handleOAuthCallback } = require('./oauth');
const { sendTokensToRenderer } = require('./oauth');
const { fetchOAuthClient } = require('./oauth');

// Fetch the token when needed
const getToken = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/access-token');
    if (!response.ok) {
      throw new Error('Failed to fetch access token');
    }
    const data = await response.json();
    return data.access_token; // Return the access token
  } catch (error) {
    console.error('Error fetching token:', error);
    throw error; // Re-throw error for further handling
  }
};

app.get('/api/access-token', (req, res) => {
  fs.readFile(path.join(tokensPath), 'utf-8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read token file.' });
    }

    try {
      const tokens = JSON.parse(data);
      if (tokens.access_token) {
        return res.json({ access_token: tokens.access_token });
      } else {
        return res.status(404).json({ error: 'Access token not found.' });
      }
    } catch (jsonError) {
      return res.status(500).json({ error: 'Failed to parse token data.' });
    }
  });
});

// Set up middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));  // Serve static files like your HTML

// Route to serve the credentials (server-side only)
app.get('/api/credentials', (req, res) => {
  const credentialsPath = path.join(__dirname, 'credentials.json');

  fs.readFile(credentialsPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading credentials file:', err);
      return res.status(500).json({ error: 'Failed to load credentials' });
    }

    const credentials = JSON.parse(data);
    res.json(credentials);
  });
});

oAuth2Client = fetchOAuthClient();

const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

const saveTokens = (tokens) => {
  fs.writeFileSync(path.join(tokensPath, JSON.stringify(tokens)));
};
// Initialize tokens variable
let tokens = {};

try {
  const tokenData = fs.readFileSync(path.join(tokensPath)); // Read existing tokens file
  tokens = JSON.parse(tokenData); // Parse and assign to tokens
  oAuth2Client.setCredentials(tokens);
  console.log('Tokens loaded:', tokens);
  if (tokens.access_token) {
    saveTokens(tokens); // Save the tokens when they are available
  }
} catch (error) {
  console.error('No tokens found or error reading tokens.json, user needs to authenticate', error);
}

// OAuth2 token refresh handling
oAuth2Client.on('tokens', (newTokens) => {
  if (newTokens.refresh_token) {
    tokens.refresh_token = newTokens.refresh_token; // This will now work if tokens is defined
  }
  tokens.access_token = newTokens.access_token;

  // Ensure the tokens object is valid before writing
  if (tokens) {
    try {
      fs.writeFileSync(path.join(tokensPath, JSON.stringify(tokens)));
      console.log('Tokens saved to tokens.json');
    } catch (writeError) {
      console.error('Error writing tokens to file:', writeError);
    }
  } else {
    console.error('Tokens object is undefined when trying to save.');
  }
});

// Routes
app.get('/auth', (req, res) => {
  console.log("Entered AUTH");
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
  ];

  console.log("Generating authUrl");

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    redirect_uri: 'http://localhost:3000/oauth2callback', // Make sure this matches your console settings
    prompt: 'consent',
  });

  console.log("Returning auth URL:", authUrl);
  res.send(authUrl); // Send the auth URL
});

app.get('/oauth2callback', async (req, res) => {
  console.log("/oauth2callback reached");
  const mainWindow = app.get('mainWindow');
  handleOAuthCallback(req, res, mainWindow);
});


app.get('/isAuthenticated', (req, res) => {
  if (tokens && tokens.access_token) {
    res.json({ isAuthenticated: true });
  } else {
    res.json({ isAuthenticated: false });
  }
});

app.get('/api/spreadsheets', async (req, res) => {
  try {
    // Load tokens from tokens.json if oAuth2Client has no credentials
    if (!oAuth2Client.credentials || !oAuth2Client.credentials.access_token) {
      const tokens = JSON.parse(fs.readFileSync(path.join(tokensPath)));
      oAuth2Client.setCredentials(tokens); // Set the credentials
    }

    // Check if credentials are present
    if (!oAuth2Client.credentials || !oAuth2Client.credentials.access_token) {
      console.error('No valid credentials found. User may not be authenticated.');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('OAuth2 Client credentials:', oAuth2Client.credentials); // Log the credentials
    const spreadsheets = await listUserSpreadsheets(oAuth2Client);
    res.json(spreadsheets);
  } catch (error) {
    console.error('Error fetching spreadsheets:', error); // Log the error
    console.error('OAuth2 Client credentials at error:', oAuth2Client.credentials); // Check credentials on error
    console.error('OAuth2 Client details:', oAuth2Client); // Log the whole client object for more details
    res.status(500).json({ error: 'Error fetching spreadsheets', details: error.message });
  }
});

async function listUserSpreadsheets(auth) {
  const drive = google.drive({ version: 'v3', auth });
  try {
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      fields: 'files(id, name)',
    });
    console.log('Drive API response:', response.data); // Log the response
    return response.data.files || [];
  } catch (error) {
    console.error('The API returned an error: ' + error.message);
    throw error;
  }
}
async function getRowData(token, spreadsheet, range) {
  const spreadsheetId = spreadsheet;
  const r = range;

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${r}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,  // Include the OAuth2 token in the headers
        'Accept': 'application/json',
      },
    });

    console.log('Response Status:', response.status);

    if (!response.ok) {
      throw new Error('Failed to fetch Google Sheets data');
    }

    const data = await response.json();
    console.log('Google Sheets Data:', data);

    // Check if values exist in the response
    let rows = data.values || [];

    // Split the data into individual arrays for each row
    // Ensure that each row from the range is represented
    const startRow = parseInt(r.split('!')[1].split(':')[0].replace(/\D/g, ''), 10);
    const endRow = parseInt(r.split('!')[1].split(':')[1].replace(/\D/g, ''), 10);

    // Fill missing rows with empty arrays if needed
    const result = [];
    for (let i = startRow; i <= endRow; i++) {
      if (rows[i - startRow]) {
        result.push(rows[i - startRow]);  // Existing row data
      } else {
        result.push([]);  // Empty row if no data exists for this row
      }
    }

    console.log('Processed Rows:', result);

    return result;  // Return the processed result
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error);
    throw error;
  }
}

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/getRow', async (req, res) => {
  console.log('Received request:', req.body);  // Log the request body for debugging

  const { spreadsheetId, month, rowIndex } = req.body;

  if (!spreadsheetId) {
    console.error('No spreadsheetId received!');
    return res.status(400).json({ error: 'Missing spreadsheetId.' });
  }

  let ranges = [];
  if (rowIndex.includes(':')) {
    const [start, end] = rowIndex.split(':').map(num => parseInt(num, 10));
    if (isNaN(start) || isNaN(end) || start < 1 || end < 1) {
      return res.status(400).json({ error: 'Invalid row index range.' });
    }
    for (let i = start; i <= end; i++) {
      ranges.push(`${month}!A${i}:Z${i}`);
    }
  } else if (rowIndex.includes(',')) {
    // Handle specific rows input (e.g., 5,7,8,10,14)
    const specificRows = rowIndex.split(',').map(num => parseInt(num.trim(), 10)).filter(num => !isNaN(num));

    // Create ranges for each specific row
    for (const row of specificRows) {
      if (row >= 1) { // Ensure valid row number
        ranges.push(`${month}!A${row}:Z${row}`);
      }
    }
  } else {
    const rowIndexInt = parseInt(rowIndex, 10);
    if (isNaN(rowIndexInt) || rowIndexInt < 1) {
      return res.status(400).json({ error: 'Invalid row index. Please enter a positive integer.' });
    }
    ranges.push(`${month}!A${rowIndexInt}:Z${rowIndexInt}`);
  }

  try {
    const token = await getToken(); // Make sure you retrieve the token here

    const results = await Promise.all(ranges.map(range => getRowData(token, spreadsheetId, range)));

    // Flatten results into one array of rows
    const data = results.flat();

    console.log("Fetched data: ", data);
    res.json(data);  // Respond with the fetched data as JSON
  } catch (error) {
    console.error('Error during data retrieval:', error.stack);
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
});
// Export the Express app for use in Electron
module.exports = app;
