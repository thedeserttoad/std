const { jsPDF } = window.jspdf;
const { ipcRenderer } = require('electron');
let globalData;
let globalFormattedData;
let spreadsheets = [];
let selectedSpreadsheetId = null;
const backgroundImg = null;
const { printLabel } = require('./public/javascript/printLogic.js');
const { img64 } = require("./public/images/image.js")
const { checkAuthentication, authenticateWithGoogle } = require("./public/javascript/auth.js");


// Function to fetch available spreadsheets
async function fetchAvailableSpreadsheets(access_token) {
  try {
    const response = await fetch('/api/spreadsheets', {
      headers: {
        Authorization: `Bearer ${access_token}`, // Include the token in the request header
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const jsonResponse = await response.json();
    console.log('Fetched data:', jsonResponse); // Log the fetched data
    spreadsheets = jsonResponse; // Store fetched spreadsheets in the global variable

    const dropdown = document.getElementById('spreadsheetSelect');
    dropdown.innerHTML = ''; // Clear existing options

    if (Array.isArray(spreadsheets) && spreadsheets.length > 0) {
      spreadsheets.forEach(spreadsheet => {
        const option = document.createElement('option');
        option.value = spreadsheet.id; // Use value attribute for ID
        option.textContent = spreadsheet.name; // Display name
        dropdown.appendChild(option);
      });
      console.log('Dropdown populated successfully.'); // Log success message
    } else {
      console.error('No spreadsheets available or unexpected response format:', jsonResponse);
      const option = document.createElement('option');
      option.textContent = 'No spreadsheets available';
      dropdown.appendChild(option);
    }
  } catch (error) {
    console.error('Error fetching spreadsheets:', error);
  }
}
// On form submit, fetch row data
document.getElementById('rowForm').onsubmit = async (event) => {
  event.preventDefault();

  const month = document.getElementById('month').value;
  const rowIndex = document.getElementById('rowIndex').value; // Keep it as a string
  const rowIndexInt = parseInt(rowIndex, 10);

  // Check if the rowIndex input is valid
  if (!rowIndex || (isNaN(rowIndexInt) && !rowIndex.includes(':'))) {
    showNotification('Please enter a valid row number or range (e.g., "3" or "3:10").');
    return;
  }

  // Ensure that selectedSpreadsheetId has been set when the user selected a spreadsheet
  if (!selectedSpreadsheetId) {
    showNotification('No spreadsheet has been selected.');
    return;
  }

  console.log('Using spreadsheetId in fetch:', selectedSpreadsheetId);

  const response = await fetch('http://localhost:3000/getRow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      spreadsheetId: selectedSpreadsheetId,
      month,
      rowIndex // Send the rowIndex as a string (either "3" or "3:10")
    })
  });

  console.log('Response Status:', response.status);

  if (!response.ok) {
    const errorText = await response.text(); // Get the response text for error details
    console.error('Error details:', errorText); // Log the error details
    showNotification(`Failed to fetch data: ${response.status} - ${errorText}`);
    return;
  }

  // Parse the JSON response directly
  const data = await response.json(); // This will parse the JSON

  if (!data) {
    showNotification('No data returned from the server.');
    return;
  }

  globalData = data;
  console.log("Global Data: ", data);

  if (!data) {
    showNotification('No data returned from the server.');
    return;
  }

  // Transform the array of arrays into an object format
  const formattedData = {};
  data.forEach((row, index) => {
    formattedData[index + 1] = row; // Use index + 1 to start from 1
    console.log("Added to formattedData: ", row)
  });

  globalFormattedData = formattedData;
  console.log("Global Formatted Data Object: ", globalFormattedData);

  // Display the formatted data in the modal
  document.getElementById('modalData').textContent = JSON.stringify(formattedData, null, 2);
  document.getElementById('modal').style.display = 'flex';
};

// Close modal function
function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

window.onload = function () {
  closeModal();
  loadSpreadsheetsFromStorage();

  // Initially hide the spreadsheet management form
  document.getElementById('spreadsheetForm').style.display = 'none'; // Hide it on load
};

document.querySelector('.close').onclick = function () {
  closeModal();
};

window.onclick = function (event) {
  if (event.target == document.getElementById('modal')) {
    closeModal();
  }
};

document.getElementById('printDataButton').onclick = function () {
  printLabel(globalFormattedData);
};


document.getElementById('loginBtn').onclick = async function () {
  console.log("Login button pushed");
  console.log("Sending /auth request");

  try {
    const authUrl = authenticateWithGoogle();  // Authenticate and get the URL
    console.log('Sending open-auth-window event with URL:', authUrl);

    ipcRenderer.send('open-auth-window', authUrl);  // Send event to open the auth window

    // Wait for the authentication callback
    ipcRenderer.on('oauth-callback', (event, callbackUrl) => {
      console.log('Received OAuth callback URL:', callbackUrl);
      // Now you can handle the URL and extract the authorization code if needed
    });
  } catch (error) {
    console.error('Authentication error:', error);
  }
};


ipcRenderer.on('auth-success', (event, token) => {
  globalToken = token; // Store the token if needed
  showNotification('Successfully authenticated with Google!');
  console.log('OAuth Token:', token);
});


ipcRenderer.on('auth-failure', (event, error) => {
  showNotification('Authentication failed. Please try again.');
  console.error('OAuth2 Authentication failed:', error);
});

// Spreadsheet selection handling
document.getElementById('addSpreadsheetBtn').onclick = async function () {
  const access_token = await checkAuthentication();
  if (access_token) {
    fetchAvailableSpreadsheets(access_token); // Pass the access token to the fetch function
  } else {
    alert('You need to authenticate to fetch spreadsheets.');
  }
};

function updateSpreadsheetDropdown() {
  const dropdown = document.getElementById('spreadsheetSelect');
  dropdown.innerHTML = '<option value="">Select a spreadsheet</option>';

  for (const name in spreadsheets) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    dropdown.appendChild(option);
  }
}

// Load spreadsheets from localStorage
function loadSpreadsheetsFromStorage() {
  const storedSpreadsheets = localStorage.getItem('spreadsheets');
  if (storedSpreadsheets) {
    spreadsheets = JSON.parse(storedSpreadsheets);
    updateSpreadsheetDropdown();
  }
}

// Event handler for the confirm button
document.getElementById('confirmSpreadsheetBtn').onclick = function () {
  const selectedDropdown = document.getElementById('spreadsheetSelect');
  const selectedId = selectedDropdown.value; // Get the ID from the dropdown

  // Check if a spreadsheet is selected
  if (selectedId) {
    console.log('Spreadsheets:', spreadsheets);

    // Find the spreadsheet object that matches the selected ID
    const selectedSpreadsheet = spreadsheets.find(spreadsheet => spreadsheet.id === selectedId);

    if (selectedSpreadsheet) {
      const spreadsheetId = selectedSpreadsheet.id; // Get the ID from the selected object
      selectedSpreadsheetId = spreadsheetId; // Store the selected spreadsheet ID
      console.log(`Selected Spreadsheet: ${selectedSpreadsheet.name}, ID: ${spreadsheetId}`);

      // Hide the available spreadsheets form
      document.getElementById('availableSpreadsheets').style.display = 'none';
      document.getElementById('spreadsheetForm').style.display = 'none'; // Hide the spreadsheet form
      document.getElementById('footer').style.display = 'none';
      document.getElementById('formContainer').style.display = 'block'; // Show the row form

      // Hide the Manage Spreadsheets button
      document.getElementById('toggleManageButton').style.display = 'none';

      // Hide header
      document.getElementById('header').style.display = 'none';
    } else {
      showNotification('Selected spreadsheet not found.');
    }
  } else {
    showNotification('Please select a spreadsheet.');
  }
};

// Back to Spreadsheet Button Click Handler
document.getElementById('backToSpreadsheetBtn').onclick = function () {
  // Hide the row form
  document.getElementById('formContainer').style.display = 'none';

  // Show the available spreadsheets form and reset its display
  document.getElementById('availableSpreadsheets').style.display = 'flex';
  document.getElementById('spreadsheetForm').style.display = 'none'; // Show the form again

  //Show header
  document.getElementById('header').style.display = 'flex';
  document.getElementById('footer').style.display = 'flex';
  // Show the Manage Spreadsheets button again
  document.getElementById('toggleManageButton').style.display = 'inline-block';

  // Clear the spreadsheet selection dropdown and reset its state if necessary
  document.getElementById('spreadsheetSelect').selectedIndex = 0; // Reset dropdown to the first option
  // Optionally reset any other form elements if needed
  document.getElementById('spreadsheetId').value = ''; // Clear the URL input
  document.getElementById('spreadsheetName').value = ''; // Clear the name input

  // Make sure to update the dropdown with the current spreadsheets
  updateSpreadsheetDropdown();
};

document.getElementById('toggleManageButton').addEventListener('click', function () {
  const form = document.getElementById('spreadsheetForm');
  const availableForm = document.getElementById('availableSpreadsheets');

  // Toggle the visibility of the spreadsheet management form
  if (form.style.display === 'none' || form.style.display === '') {
    availableForm.style.display = 'none';
    form.style.display = 'flex'; // Show the form
    this.textContent = 'Hide Settings'; // Update button text
  } else {
    form.style.display = 'none'; // Hide the form
    this.textContent = 'Settings'; // Update button text
    availableForm.style.display = 'flex';
  }
});

function showNotification(message, duration = 3000) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.classList.remove('hidden');
  notification.classList.add('show');

  setTimeout(() => {
    notification.classList.remove('show');
    notification.classList.add('hidden');
  }, duration);
}


