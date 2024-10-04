// oauth.js
const { ipcMain } = require('electron');
const fs = require('fs');
const { google } = require('googleapis');


function fetchOAuthClient(){
    // Load OAuth2 credentials
    const credentials = require('./credentials.json');
    const { client_id, client_secret, redirect_uris } = credentials.web;
    console.log(redirect_uris)
    const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:3000/oauth2callback'
    );
    return oAuth2Client;
}

const oAuth2Client = fetchOAuthClient();

async function handleOAuthCallback(req, res, mainWindow) {
    const { code } = req.query;

    if (!code) {
        console.error('No code received in the query!');
        return res.status(400).send('No code provided');
    }

    console.log("Oauth Code: " + code); // Log the OAuth code

    try {
        console.log("Trying to retrieve tokens");

        // Await the token response from getToken
        const { tokens } = await oAuth2Client.getToken(code); // Await the token response
        
        if (!tokens) {
            throw new Error('No tokens returned from OAuth server');
        }

        console.log("Tokens: ", tokens); // Log tokens
        oAuth2Client.setCredentials(tokens); // Set the credentials
        console.log('Tokens obtained:', tokens); // Log the tokens

        if (tokens.access_token) {
            saveTokens(tokens); // Save the tokens when they are available
        }

        // Send the tokens to the renderer process
        sendTokensToRenderer(mainWindow, tokens);

        // Save tokens to file if a refresh token is present
        if (tokens.refresh_token) {
            fs.writeFileSync('tokens.json', JSON.stringify(tokens));
            console.log('Tokens saved to tokens.json');
        } else {
            console.log('No refresh token received');
        }

        // Redirect the user to your app's main page with the access token
        res.redirect(`http://localhost:3000/?access_token=${tokens.access_token}`);

        const tokensJson = require('./tokens.json');
        oAuth2Client.setCredentials(tokensJson);
    
        // Emit an event to close the auth window
        ipcMain.emit("oauth-success", tokens);

    } catch (error) {
        console.error('Error retrieving access token:', error); // Log the entire error
        res.status(500).send('Error retrieving access token');
    }
}

const saveTokens = (tokens) => {
    fs.writeFileSync('tokens.json', JSON.stringify(tokens));
  };
  

// Function to send tokens to the renderer process
function sendTokensToRenderer(mainWindow, tokens) {
    if (mainWindow) {
        mainWindow.webContents.send('oauth-success', tokens);
    } else {
        console.error('Main window is not defined');
    }
}

module.exports = { 
    handleOAuthCallback,
    fetchOAuthClient,
    sendTokensToRenderer
 };
