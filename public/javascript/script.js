const { jsPDF } = window.jspdf;
const { ipcRenderer, remote } = require('electron');
const { checks } = require('googleapis/build/src/apis/checks');
let globalData;
let globalFormattedData;
let spreadsheets = [];
let selectedSpreadsheetId = null;
const backgroundImg = null;
let printLabel, img64, checkAuthentication, authenticateWithGoogle;
var inRowForm = false;
let isSignedIn = false;
var fromSheetSelection = false;
const defaultFrontPageHeight = '340px';
const defaultWidth = '280px';
const defaultSettingsPageHeight = '490px';


let windowHeight = window.height;
let windowWidth = window.width;

document.addEventListener('DOMContentLoaded', function () {
  const otherSettingsForm = document.getElementById('otherSettings');
  otherSettingsForm.style.display = 'none';  
});

document.addEventListener('DOMContentLoaded', function () {
  UpdateAccountStatus();
    UpdateSpreadsheets();
});

function fadeIn(button) {
    button.style.display = 'flex'; // Make the button visible
    button.classList.remove('fade-out'); // Remove fade-out class if it exists
    button.classList.add('fade-in'); // Add fade-in class

    setTimeout(() => {
        button.classList.remove('fade-in'); // Reset for future use
    }, 500);
}

function fadeOut(button) {
  
    button.classList.remove('fade-in'); // Remove fade-in class
    button.classList.add('fade-out'); // Add fade-out class

    // Hide the button after the animation completes
    setTimeout(() => {
        button.style.display = 'none';
    }, 500); // Match this to your animation duration
}

function animateBackground(ctx, pattern, canvas) {
  let offsetX = -50; // Initial X offset for scrolling
  const speed = 1;  // Speed of the background movement

  function draw() {
    // Clear the canvas for each frame to prevent overlap
    ctx.clearRect(0, 0, screen.width * 2, canvas.height);

    // Save the context state before applying translation
    ctx.save();

    // Apply translation to create the scrolling effect
    ctx.translate(offsetX, 0);
    ctx.fillStyle = '#cce6ff';
    ctx.fillRect(offsetX, 0, screen.width*2, canvas.height);
    ctx.fillRect(offsetX + (screen.width * 2), 0, screen.width*2, canvas.height);

    // Fill the entire canvas with the background pattern
    ctx.fillStyle = pattern;
    // Draw two patterns side by side to create the loop
    ctx.fillRect(offsetX, 0, screen.width * 2, canvas.height); // First pattern
    ctx.fillRect(offsetX + (screen.width * 2), 0, screen.width * 2, canvas.height); // First pattern

    // Restore the context state
    ctx.restore();

    // Update the X offset to create scrolling motion
    offsetX -= speed;

    // Reset the offset to prevent it from becoming too large (looping the pattern)
    if (offsetX <= -screen.width + 95) {
      offsetX = 0;
    }

    // Request the next animation frame
    requestAnimationFrame(draw);
  }

  // Start the animation loop
  requestAnimationFrame(draw);
}

window.addEventListener('resize', function() {
  if (window.innerWidth <= 600) {
      window.resizeTo(650, window.innerWidth);
      windowWidth = window.width;
  }
  if (window.innerHeight <= 850) {
      window.resizeTo(window.innerHeight, 900);
      windowHeight = window.height;
  }
});

document.addEventListener('DOMContentLoaded', function () {
  // Import the image data from image.js
  const backgroundImgPath = require('./public/images/image.js');
  const movingBackgroundImgPath = require('./public/images/backgroundImage.js'); // Adjust the path as needed
  const img = backgroundImgPath.img64; // Access the Base64 string
  const backImg = movingBackgroundImgPath.img64;

  // Get the canvas element
  const canvas = document.getElementById('backgroundCanvas');
  const ctx = canvas.getContext('2d');

  const image = new Image();
  image.src = backImg; // Load the Base64 image

  let pattern; // Declare the pattern variable outside to use later

  function resizeCanvas() {
    // Set the canvas width and height to match the window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Fill the background with a solid color before applying the pattern
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#cce6ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // If the pattern is already created, fill the canvas with it
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, canvas.width * 2, canvas.height);
      animateBackground(ctx, pattern, canvas);
    }
  }

  image.onload = function () {
    // Define the cropping rectangle (adjust these values based on your needs)
    const sourceX = 160; // Starting x position for cropping
    const sourceY = 60; // Starting y position for cropping
    const sourceWidth = image.width - 320; // Width of the cropped area
    const sourceHeight = image.height - 80; // Height of the cropped area

    const scaleFactor = 0.5; // Change this to scale the image (e.g., 0.5 for half size)

    // Create a temporary canvas for pixel manipulation
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    // Set the temporary canvas to the desired size after scaling
    tempCanvas.width = sourceWidth * scaleFactor; // Set to scaled width
    tempCanvas.height = sourceHeight * scaleFactor; // Set to scaled height

    // Draw the cropped and scaled image on the temporary canvas
    tempCtx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, tempCanvas.width, tempCanvas.height); // Draw to scaled size

    // Get image data from the temporary canvas and modify the pixels
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    // Function to check if a pixel is transparent
    function isTransparent(data, width, height, x, y) {
      const index = (y * width + x) * 4;
      return data[index + 3] === 0; // Check if alpha is 0 (transparent)
    }

    // Pixel modification loop
    for (let y = 0; y < tempCanvas.height; y++) {
      for (let x = 0; x < tempCanvas.width; x++) {
        const index = (y * tempCanvas.width + x) * 4;

        // Check for non-white pixel
        if (data[index] !== 255 || data[index + 1] !== 255 || data[index + 2] !== 255) {
          // Check surrounding pixels (up, down, left, right)
          let hasTransparentNeighbor = false;

          // Check up
          if (y > 0 && isTransparent(data, tempCanvas.width, tempCanvas.height, x, y - 1)) {
            hasTransparentNeighbor = true;
          }
          // Check down
          if (y < tempCanvas.height - 1 && isTransparent(data, tempCanvas.width, tempCanvas.height, x, y + 1)) {
            hasTransparentNeighbor = true;
          }
          // Check left
          if (x > 0 && isTransparent(data, tempCanvas.width, tempCanvas.height, x - 1, y)) {
            hasTransparentNeighbor = true;
          }
          // Check right
          if (x < tempCanvas.width - 1 && isTransparent(data, tempCanvas.width, tempCanvas.height, x + 1, y)) {
            hasTransparentNeighbor = true;
          }

          // If any surrounding pixel is transparent, set the current pixel to black
          if (hasTransparentNeighbor) {
            data[index] = 0;     // Set red to 0
            data[index + 1] = 0; // Set green to 0
            data[index + 2] = 0; // Set blue to 0
            data[index + 3] = 255;
            // alpha remains unchanged
          } 
        } else {
          // If the pixel is white, make it transparent
          data[index + 3] = 0; // Set alpha to 0 for white pixels
        }
      }
    }

    // Set the temporary canvas to the desired size after scaling
    tempCanvas.width = sourceWidth * scaleFactor; // Set to scaled width
    tempCanvas.height = sourceHeight * scaleFactor; // Set to scaled height
    
    // Put modified image data back to the temporary canvas
    tempCtx.putImageData(imageData, 0, 0);

    pattern = ctx.createPattern(tempCanvas, 'repeat'); // Create repeat pattern

    // Draw the initial canvas
    resizeCanvas();
  };

  // Adjust canvas viewport when window resizes
  window.addEventListener('resize', resizeCanvas);

  console.log('Image Source:', img); // Optional: log to verify
});


async function UpdateAccountStatus() {
  console.log("Reached update function");
  setStatus();
}

async function isLoggedIn() {
  try {
    const response = await fetch('/api/isAuthenticated');
    console.log(response);
  } catch {
    console.log("Some error", error);
  }
}

async function setStatus() {
  const accountStatus = document.getElementById('accountStatus');
  
  if (!isSignedIn) {
    const status = await checkAuthentication();
    console.log("Status = ", status);
    if (status != null) {
      console.log("Account Signed In")
      accountStatus.innerHTML = 'Account Status: <span style="color: green;">Signed In</span>';
    }
  } else {
    console.log("Account not Signed in")
    accountStatus.innerHTML = 'Account Status: <span style="color: red;">Not Signed In</span>';
  }
}

const path = require('path');

// Async function to require modules safely
(async () => {
  const appPath = await ipcRenderer.invoke('get-app-path');
  //const appPath = await window.electronAPI.getAppPath();
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

    //console.log(response);
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
  if (!rowIndex || (isNaN(rowIndexInt) && !rowIndex.includes('-'))) {
    showNotification('Please enter a valid row number or range (e.g., "3" or "3-10").');
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
  let = document.getElementById('modalData').innerHTML = generateTableHTML(partialData);
  showModal();
};

function showModal() {

  const modal = document.getElementById('modal');
   modal.style.display = 'block';
  fadeIn(modal);

}

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
  const modal = document.getElementById('modal');
  fadeOut(modal);
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
//    window.electronAPI.openAuthWindow(authUrl);  

    // Wait for the authentication callback
    ipcRenderer.on('oauth-callback', (event, callbackUrl) => {
    //window.electronAPI.onOAuthCallback((callbackURL) => {  
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

async function UpdateSpreadsheets() {
  const status = await checkAuthentication();
  fetchAvailableSpreadsheets(status);
}

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
document.getElementById('confirmSpreadsheetBtn').onclick = async function () {
  const selectedDropdown = document.getElementById('spreadsheetSelect');
  const selectedId = selectedDropdown.value; // Get the ID from the dropdown UNCOMMENT
  const formContainer = document.getElementById('formContainer');
  const content = document.querySelector('.content');
  const formRect = content.getBoundingClientRect();
  const contentBackground = document.getElementById('contentBackground');
  const appPath = await ipcRenderer.invoke('get-app-path');

  if (selectedId) {
    console.log('Spreadsheets:', spreadsheets);
    // Find the spreadsheet object that matches the selected ID
    const selectedSpreadsheet = spreadsheets.find(spreadsheet => spreadsheet.id === selectedId); //UNCOMMENT
    const { isTrue, isFalse, SheetSelection } = require(path.join(appPath, 'public', 'javascript', 'sheetbool.js')); // Adjust the path as necessary

    
    if (selectedSpreadsheet) {
         
      fromSheetSelection = true;
      inRowForm = true; 
      console.log("is currently in the row form");
     
      const spreadsheetId = selectedSpreadsheet.id; // Get the ID from the selected object UNCOMMENT
      selectedSpreadsheetId = spreadsheetId; // Store the selected spreadsheet ID UNCOMMENT
      console.log(`Selected Spreadsheet: ${selectedSpreadsheet.name}, ID: ${spreadsheetId}`); //UNCOMMENT

      if(selectedSpreadsheet.name.toLowerCase().includes("parts")) { isTrue(); } else { isFalse(); }
      if(SheetSelection()) {
        document.getElementById("dataTitle").innerHTML = ("Parts");
      } else {
        document.getElementById("dataTitle").innerHTML = ("Accessories");
      }

      // Hide the available spreadsheets form
      document.getElementById('availableSpreadsheets').style.display = 'none';
      document.getElementById('spreadsheetForm').style.display = 'none'; // Hide the spreadsheet form
      document.getElementById('footer').style.display = 'none';
      
      // Hide the Manage Spreadsheets button
      document.getElementById('toggleManageButton').style.display = 'none';
            
      // Set the height and width of contentBackground based on formContainer's dimensions
      contentBackground.style.height = '520px';  // Add 'px'
      contentBackground.style.width = '280px';
      contentBackground.style.top = '-37%';    // Add 'px'

      // Get the window's height and set the top position of contentBackground
      const windowHeight = window.innerHeight;
      contentBackground.style.top = (windowHeight / 2) - (formRect.height); // + (formRect.height / 4)) + 'px';  // Center it vertically
      //contentBackground.style.top = '-5%';
      fadeIn(formContainer);
      document.getElementById('formContainer').style.display = 'flex'; // Show the row form
        
      fadeIn(backBtn); 

      // Hide header
      //document.getElementById('header').style.display = 'none';
    } else {
      showNotification('Selected spreadsheet not found.');
    }
  } else {
    showNotification('Please select a spreadsheet.');
  }
};

// Back to Spreadsheet Button Click Handler
document.getElementById('backToSpreadsheetBtn').onclick = function () {
  contentBackground.style.height = defaultFrontPageHeight;
  contentBackground.style.width = defaultWidth;
  contentBackground.style.top = '-40%';
 

   if (inRowForm) {
      inRowForm = false;
      
      console.log("Not in row form");
   }

  // Hide the row form
  document.getElementById('formContainer').style.display = 'none';

  // Show the available spreadsheets form and reset its display
  fadeIn(availableSpreadsheets);
  document.getElementById('spreadsheetForm').style.display = 'none'; // Show the form again

  //Show header
  document.getElementById('header').style.display = 'flex';
  document.getElementById('footer').style.display = 'flex';
  // Show the Manage Spreadsheets button again
  fadeIn(toggleManageButton);

  // Clear the spreadsheet selection dropdown and reset its state if necessary
  document.getElementById('spreadsheetSelect').selectedIndex = 0; // Reset dropdown to the first option
  // Optionally reset any other form elements if needed
  document.getElementById('spreadsheetId').value = ''; // Clear the URL input
  document.getElementById('spreadsheetName').value = ''; // Clear the name input

  // Make sure to update the dropdown with the current spreadsheets
  updateSpreadsheetDropdown();

  
};

document.getElementById('toggleManageButton').addEventListener('click', function () {
//  location.reload();
  const contentBackground = document.getElementById("contentBackground")
  const form = document.getElementById('spreadsheetForm');
  const availableForm = document.getElementById('availableSpreadsheets');
  const otherSettingsForm = document.getElementById('otherSettings');
  const featuresBtn = document.getElementById('featuresBtn');
  const changelogBtn = document.getElementById('changelogBtn');

  // Determine if the form is currently visible
  const isFormVisible = window.getComputedStyle(form).display !== 'none';


  // Toggle the visibility of the spreadsheet management form
  if (!isFormVisible) {
    console.log("Current form display: ", form.style.display);
    console.log("Switching to settings");
    contentBackground.style.height = defaultSettingsPageHeight;
    contentBackground.style.top = '-28%';
    availableForm.style.display = 'none';
    otherSettingsForm.style.display = 'flex';
    changelogBtn.style.display = 'flex';// show border
    featuresBtn.style.display = 'flex';
    this.textContent = 'Back'; // Update button text
    fadeIn(form);
    

    fadeIn(otherSettingsForm);
    form.style.display = 'flex';
    otherSettingsForm.style.display = 'flex';
    

  } else {
    console.log("Current form display: ", form.style.display);
    console.log("Switching to default");
    contentBackground.style.height = defaultFrontPageHeight;
    contentBackground.style.top = '-40%';
    otherSettingsForm.style.display = 'none'; // hide border on run
    form.style.display = 'none'; // Hide the form
    this.textContent = 'Settings';
    fadeIn(availableForm);
    availableForm.style.display = 'flex';
    

  }
});

document.getElementById('toggleManageButton').addEventListener('click', function () {

    fadeIn(this);
     
});

document.getElementById("refreshButton").addEventListener('click', async function(event) {
  event.preventDefault(); // Prevent the default form submission
  console.log("Refreshed!");
//  await isLoggedIn();
    await UpdateSpreadsheets();
//    await UpdateAccountStatus();
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
  const border = document.getElementById('otherSettings');
  const changelogBackBtn = document.getElementById('changelogBackBtn');
  const backBtn = document.getElementById('backBtn');
  const settingsForm = document.getElementById('spreadsheetForm');
  const changelogContent = document.getElementById('changelogContent');
  const hideSettingsButton = document.getElementById('toggleManageButton');
  const featuresBtn = document.getElementById('featuresBtn');
  const featuresFromRowFormBtn = document.getElementById('rowFormFeaturesBtn')
  const betaText = document.getElementById('footer');
  const featuresContent = document.getElementById('featuresContent');
  const contentBackground = document.getElementById('contentBackground');
  const formContainer = document.getElementById('formContainer');

  // Initially hide the changelog content and back button
  changelogContent.style.display = 'none';
  backBtn.style.display = 'none';

  const defaultFrontPageHeight = '340px';
  const defaultWidth = '280px';
  const defaultSettingsPageHeight = '490px';


  // Add an event listener to the changelog button
  changelogBtn.addEventListener('click', function () {
    const footer = document.getElementById('footer');

    // Hide the settings form and show the changelog
    footer.style.display = 'none';
    border.style.display = 'none';
    featuresBtn.style.display = 'none';
    settingsForm.style.display = 'none'; // Hide settings
    
    contentBackground.style.height = '360px';
    contentBackground.style.width = '500px';
    contentBackground.style.top = '-63%';


    fadeIn(changelogContent);
    changelogContent.style.display = 'flex'; // Show changelog
     
    fadeIn(changelogBackBtn); 
    
    changelogBackBtn.style.display = 'flex';
    hideSettingsButton.style.display = 'none';
    changelogBtn.style.display = 'none';
    betaText.style.display = 'none';
     
      
  });

  changelogBackBtn.addEventListener('click', function() { 
      // Hide the changelog and show the settings form
      
      contentBackground.style.height = defaultSettingsPageHeight;
      contentBackground.style.width = defaultWidth;
      contentBackground.style.top = '-28%';
      
      border.style.display = 'flex';
       

      fadeIn(changelogBtn);
      changelogBtn.style.display = 'flex';
      changelogContent.style.display = 'none';  // Hide changelog
       

      fadeIn(settingsForm);
      settingsForm.style.display = 'flex'; // Show settings
      backBtn.style.display = 'none';  // Hide back button
      featuresContent.style.display = 'none';
       

      fadeIn(featuresBtn);
       

      fadeIn(betaText);
      betaText.style.display = 'flex';
       

      fadeIn(hideSettingsButton);
      hideSettingsButton.style.display = 'flex';
       
  });




  // Add an event listener to the back button
  backBtn.addEventListener('click', function () {
    if (inRowForm) {
      document.getElementById('contentBackground');
      document.getElementById('featuresContent').style.display = 'none';
      fadeIn(formContainer); // Show the row form

      contentBackground.style.width = defaultWidth;
      contentBackground.style.height = '520px';

    }
        
    else {
      // Hide the changelog and show the settings form
      contentBackground.style.width = defaultWidth;
      contentBackground.style.height = defaultSettingsPageHeight;
      contentBackground.style.top = '-28%';

      border.style.display = 'flex';
      changelogContent.style.display = 'none';  // Hide changelog
      
      fadeIn(settingsForm);  // Show settings
      settingsForm.style.display = 'flex';
      backBtn.style.display = 'none';  // Hide back button
      featuresContent.style.display = 'none';
      hideSettingsButton.style.display = 'flex';
       
      
      fadeIn(featuresBtn);
     // featuresBtn.style.display = 'flex';
       
      
      fadeIn(changelogBtn);
      //changelogBtn.style.display = 'flex';
      
      fadeIn(betaText);
     // betaText.style.display = 'flex';
       
      
      fadeIn(hideSettingsButton);
      //hideSettingsButton.style.display = 'flex';
       
    }
  });

  featuresFromRowFormBtn.addEventListener('click', function() {
    inRowForm = true;

    contentBackground.style.width = '500px';
    
    openFeatures();
  });
  
  function openFeatures() {
    document.getElementById('formContainer').style.display = 'none'; 
    contentBackground.style.height = '505px';
    contentBackground.style.width = '450px';
    settingsForm.style.display = 'none';  // Hide settings
    changelogContent.style.display = 'none';  // Show changelog
    fadeIn(featuresContent);
    fadeIn(backBtn);
    backBtn.style.display = 'flex';
    hideSettingsButton.style.display = 'none';
      changelogBtn.style.display = 'none';
    betaText.style.display = 'none';
  }

  featuresBtn.addEventListener('click', function () {
  console.log(inRowForm);
      contentBackground.style.height = '505px';
      contentBackground.style.width = '450px';
      contentBackground.style.top = '-38%';
      border.style.display = 'none';
      settingsForm.style.display = 'none';  // Hide settings
      changelogContent.style.display = 'none';  // Show changelog

      fadeIn(featuresContent);
      
      fadeIn(backBtn);
      backBtn.style.display = 'flex';
      hideSettingsButton.style.display = 'none';
      featuresBtn.style.display = 'none';
      //changelogBtn.style.display = 'none';
      betaText.style.display = 'none';
        

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

          const item = data.changelog[0];
          const paragraph = document.createElement('p');
          paragraph.innerHTML = `<strong>Version ${item.version}:</strong> ${item.description}`;
          changelogList.appendChild(paragraph);
      })
      .catch(error => {
          console.error('Error fetching changelog:', error);
      });
}
// Call the function when the changelog button is clicked
changelogBtn.addEventListener('click', function () {
  loadChangelog();
});

async function ResizeContent() {
  const background = document.getElementById('contentBackground');
  const content = document.querySelector('.content');
  const header = document.getElementById('header');
  
  const headerHeight = header.offsetHeight;
  const headerWidth = header.offsetWidth;
  const headerX = header.offsetX;
  const headerY = header.offsetY;

  const contentHeight = content.offsetHeight;
  const contentWidth = content.offsetWidth;
  const contentX = content.offsetX;
  const contentY = content.offsetY;

  const newWidth = 0;
  const newHeight = 0;
  const newX = 0;
  const newY = 0;

  /* SET NEW HEIGHT/WIDTH FOR CONTENT*/

  if (content.offsetWidth < header.offsetWidth) {
    newWidth = (window.innerWidth / 2)
                      - (content.offsetWidth)
                      + 50;
  } else {
    newWidth =  (window.innerWidth / 2)
                - (header.offsetWidth);
  }

  newHeight = (window.innerHeight / 2)
              - (contentHeight)
              - (headerHeight / 2);


  /* SET NEW X, Y COORDS FOR CONTENT */

  // Apply the calculated height to the content element
  background.style.height = newHeight + 'px';
  background.style.width = newWidth + 'px';

  background.style.transform.translateX 
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

window.onload = async function() {
  const splash = document.getElementById('splash');
  const background = document.getElementById('splashBackground');

  // Start the animation after a 1-second delay
  setTimeout(() => {
      fadeOut(splash); // Trigger the animation
  }, 1000); // Delay before starting the animation

  // Hide the splash screen after the animation completes (3 seconds)
  setTimeout(() => {
      splash.style.display = 'none'; // Hide the splash screen
  }, 4000); // Total delay (1000ms + 3000ms animation duration) 
};

