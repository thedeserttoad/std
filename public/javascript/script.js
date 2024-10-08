const { jsPDF } = window.jspdf;
const { ipcRenderer, remote } = require('electron');
let globalData;
let globalFormattedData;
let spreadsheets = [];
let selectedSpreadsheetId = null;
const backgroundImg = null;
let printLabel, img64, checkAuthentication, authenticateWithGoogle;


document.addEventListener('DOMContentLoaded', function () {
  const otherSettingsForm = document.getElementById('otherSettings');
  otherSettingsForm.style.display = 'none';
});


const path = require('path');

  // Add an event listener to the changelog button
  changelogBtn.addEventListener('click', function () {    //Wtf does this do?
    //window.location.href = 'changelog.html';  // Redirects to changelog page
  });

// Async function to require modules safely
(async () => {
  const appPath = await ipcRenderer.invoke('get-app-path');

  try {
    // Require printLogic.js
    const printLogic = require(path.join(appPath, 'public', 'javascript', 'printLogic.js'));
    printLabel = printLogic.printLabel;
  } catch (error) {
    console.error("Error requiring printLogic.js:", error);
  }

  try {
    // Require image.js
    const image = require(path.join(appPath, 'public', 'images', 'image.js'));
    img64 = image.img64;
  } catch (error) {
    console.error("Error requiring image.js:", error);
  }

  try {
    // Require auth.js
    const auth = require(path.join(appPath, 'public', 'javascript', 'auth.js'));
    checkAuthentication = auth.checkAuthentication;
    authenticateWithGoogle = auth.authenticateWithGoogle;
  } catch (error) {
    console.error("Error requiring auth.js:", error);
  }
})();


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
  // Create a new object to hold only the values 1-3 from each array
  let partialData = {};

  // Loop through the object and slice the arrays
  for (let key in globalFormattedData) {
      if (globalFormattedData.hasOwnProperty(key)) {
          // Slice the first three values (index 0, 1, and 2)
          partialData[key] = globalFormattedData[key].slice(1, 4);
      }
  }

  // Display the sliced data in the modal
  document.getElementById('modalData').textContent = JSON.stringify(partialData, null, 2);

  console.log("Partial Data Object: ", partialData);
  // Display the formatted data in the modal
  //document.getElementById('modalData').textContent = JSON.stringify(formattedData, null, 2);
  // Insert the generated table HTML into the modal
  document.getElementById('modalData').innerHTML = generateTableHTML(partialData);
  document.getElementById('modal').style.display = 'flex';
};

// Function to generate HTML table
function generateTableHTML(data) {
  let table = '<table border="1" style="width: 100%; border-collapse: collapse;">';
  table += '<tr><th>Date</th><th>Name</th><th>Phone</th></tr>'; // Table header

  // Loop through the data to generate table rows
  for (let key in data) {
      if (data.hasOwnProperty(key)) {
          const [date, name, phone] = data[key]; // Destructure array elements
          table += `<tr><td>${date}</td><td>${name}</td><td>${phone}</td></tr>`;
      }
  }
  table += '</table>';
  return table;
}

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
  const otherSettingsForm = document.getElementById('otherSettings');

  // Toggle the visibility of the spreadsheet management form
  if (form.style.display === 'none' || form.style.display === '') {
    availableForm.style.display = 'none';
    form.style.display = 'flex'; // Show the form
    otherSettingsForm.style.display = 'flex'; // show border
    this.textContent = 'Back'; // Update button text
  } else {
    otherSettingsForm.style.display = 'none'; // hide border on run
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

document.addEventListener('DOMContentLoaded', function () {
  // Grab references to elements you'll work with
  const changelogBtn = document.getElementById('changelogBtn');
  const backBtn = document.getElementById('backBtn');
  const settingsForm = document.getElementById('spreadsheetForm');
  const changelogContent = document.getElementById('changelogContent');
  const hideSettingsButton = document.getElementById('toggleManageButton');
  const changelogButton = document.getElementById('otherSettings');

  // Initially hide the changelog content and back button
  changelogContent.style.display = 'none';
  backBtn.style.display = 'none';

  // Add an event listener to the changelog button
  changelogBtn.addEventListener('click', function () {
    // Hide the settings form and show the changelog
    settingsForm.style.display = 'none';  // Hide settings
    changelogContent.style.display = 'flex';  // Show changelog
    backBtn.style.display = 'flex';
    hideSettingsButton.style.display = 'none';
    changelogButton.style.display = 'none';
      // Show back button
  });

  // Add an event listener to the back button
  backBtn.addEventListener('click', function () {
    // Hide the changelog and show the settings form
    changelogContent.style.display = 'none';  // Hide changelog
    settingsForm.style.display = 'flex';  // Show settings
    backBtn.style.display = 'none';  // Hide back button
    hideSettingsButton.style.display = 'block';
    changelogButton.style.display = 'flex';
  });
});

// Function to fetch the changelog JSON and display it
function loadChangelog() {
  fetch('changelog.json') // Fetch the JSON file
      .then(response => {
          if (!response.ok) {
              throw new Error('Network response was not ok');
          }
          return response.json(); // Parse the JSON
      })
      .then(data => {
          const changelogList = document.getElementById('changelogList');
          changelogList.innerHTML = ''; // Clear any existing content

          // Iterate over the changelog items and create HTML
          data.changelog.forEach(item => {
              const paragraph = document.createElement('p');
              paragraph.textContent = `Version ${item.version}: ${item.description}`;
              changelogList.appendChild(paragraph); // Add the paragraph to the list
          });
      })
      .catch(error => {
          console.error('Error fetching changelog:', error);
      });
}

// Call the function when the changelog button is clicked
changelogBtn.addEventListener('click', function () {
  // Hide the settings form
  //settingsForm.style.display = 'none';

  // Show the changelog
  //changelogContent.style.display = 'flex';
  
  // Load the changelog content
  loadChangelog();
});

// Add the back button functionality
backBtn.addEventListener('click', function () {
  // Hide the changelog
  //changelogContent.style.display = 'none';
  
  // Show the settings form
  //settingsForm.style.display = 'flex';
});



