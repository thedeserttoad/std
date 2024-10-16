async function checkAuthentication() {
    // First, try to get the access token from the URL or local storage
    const urlParams = new URLSearchParams(window.location.search);
    const accessTokenFromUrl = urlParams.get('access_token');
    const accessTokenFromStorage = localStorage.getItem('access_token');
  
    console.log('Access Token from URL:', accessTokenFromUrl);
    console.log('Access Token from localStorage:', accessTokenFromStorage);
  
    let accessToken;
  
    // Prioritize using access token from the URL if available (from the OAuth2 redirect)
    if (accessTokenFromUrl) {
      accessToken = accessTokenFromUrl;
      localStorage.setItem('access_token', accessToken); // Store token in localStorage
      console.log('Access token retrieved from URL and saved:');
  
      // Clear the token from the URL to avoid repeating this process unnecessarily
      const newUrl = window.location.href.split('?')[0];
      window.history.replaceState({}, document.title, newUrl);
    } else if (accessTokenFromStorage) {
      accessToken = accessTokenFromStorage;
      console.log('Access token retrieved from localStorage:');
    } else {
      // No token available in either URL or localStorage, try fetching from backend
      try {
        const response = await fetch('/api/access-token');
        if (!response.ok) {
          throw new Error('Failed to fetch access token from backend');
        }
  
        const data = await response.json();
        accessToken = data.access_token;
  
        if (accessToken) {
          localStorage.setItem('access_token', accessToken); // Store token in localStorage
          console.log('Access token retrieved from backend and saved:');
        } else {
          console.log('No access token found in backend.');
        }
      } catch (error) {
        console.error('Error fetching access token:', error);
        alert('Failed to retrieve access token. Please authenticate again.');
      }
    }
  
    if (accessToken) {
      console.log("Access token exists:");
      console.log(accessToken);
      return accessToken; // Return the access token
    } else {
      console.log('No access token found. Please authenticate again.');
      return null; // Return null if no token is found
    }
  }
  
  async function authenticateWithGoogle() {
    console.log('Requesting auth URL from server...');
    const response = await fetch('http://localhost:3000/auth');
    const authUrl = await response.text(); // or response.json() if you decide to return JSON
  
    console.log('Received auth URL:', authUrl);
    // Send the auth URL to the main process to open the auth window
    ipcRenderer.send('open-auth-window', authUrl);
    //window.location.href = '/auth';
  }

  module.exports = {
    authenticateWithGoogle,
    checkAuthentication
  };