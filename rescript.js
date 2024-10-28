//rescript.js


/****************** GLOBAL DECLARATIONS ***********************/

const defaultFrontPageHeight = '340px';
const defaultWidth = '280px';
const defaultSettingsPageHeight = '490px';
const { jsPDF } = window.jspdf;
const { ipcRenderer, remote } = require('electron');
const path = require("path");
const { checks } = require('googleapis/build/src/apis/checks');
const backgroundImg = null;

let globalData;
let globalFormattedData;
let spreadsheets = [];
let selectedSpreadsheetId = null;
let printLabel, img64, checkAuthentication, authenticateWithGoogle;
let inRowForm = false;
let isSignedIn = false;
let fromSheetSelection = false;

let windowHeight = window.height;
let windowWidth = window.width;

/******************* HTML DECLARATIONS ***********************/

//Splash
const splashContainer = document.getElementById("splash");
const splashBackground = document.getElementById("splashBackground");
const splashImage = document.getElementById("splashImage");

//Background
const backgroundContainer = document.getElementById("background");
const backgroundImage = document.getElementById("backgroundImg");
const backgroundCanvas = document.getElementById("backgroundCanvas");

//Content Background
const contentBackground = document.getElementById("contentBackground");

//Default page

//Header
const header = document.getElementById("header");
const headerImage = document.getElementById("logoimg");

//Settings
const loginButton = document.getElementById("loginButton");
const refreshSpreadsheetsButton = document.getElementById("refreshButton");
const changelogButton = document.getElementById("changelogButton");
const featuresButton = document.getElementById("featuresButton");

//Changelog
const changelog = document.getElementById("changelogContent");
const changelogBackButton = document.getElementById("changelogBackBtn");

//Features
const features = document.getElementById("featuresContent");
const featuresBackButton = document.getElementById("backBtn");

//Row Input Form
const rowFormContainer = document.getElementById("formContainer");
const rowForm = document.getElementById("rowForm");
const rowFormMonthSelection = document.getElementById("month");
const rowFormRowSelection = document.getElementById("rowIndex");
const rowFormFeaturesButton = document.getElementById("rowFormFeaturesBtn");
const rowFormBackButton = document.getElementById("backToSpreadsheetBtn");

//Modal
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");
const printDataButton = document.getElementById("printDataButton");

//Footer
const footer = document.getElementById("footer");

//Notifications
const notification = document.getElementById("notification");

//Label
const label = document.getElementById("labelPreview");
const labelContent = document.getElementById("labelContent");

/********************* MODULE LOADING ***********************/

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


/*************** IPC RENDERER FUCNTIONS ****************/

ipcRenderer.on('auth-success', (event, token) => {
  globalToken = token; // Store the token if needed
  showNotification('Successfully authenticated with Google!');
  console.log('OAuth Token:', token);
});


ipcRenderer.on('auth-failure', (event, error) => {
  showNotification('Authentication failed. Please try again.');
  console.error('OAuth2 Authentication failed:', error);
});


/*************** HELPER FUNCTIONS *********************/


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

/**************** On-Startup **************************/

window.onload = function () {
  closeModal();
  loadSpreadsheetsFromStorage();

  // Initially hide the spreadsheet management form
  document.getElementById('spreadsheetForm').style.display = 'none'; // Hide it on load
};


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


document.addEventListener('DOMContentLoaded', function () {
  const otherSettingsForm = document.getElementById('otherSettings');
  otherSettingsForm.style.display = 'none';  
});

document.addEventListener('DOMContentLoaded', function () {
  UpdateAccountStatus();
    UpdateSpreadsheets();
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

/****************** DEFAULT PAGE ******************************/
function showDefaultPage() {}
function hideDefaultPage() {}

/****************** SETTINGS PAGE *****************************/
function showSettingsPage() {}
function hideSettingsPage() {}

/****************** FEATURES PAGE *****************************/
function showFeaturesPage() {}
function hideFeaturesPage() {}


/****************** CHANGELOG PAGE ****************************/
function showChangelogPage() {}
function hideChangelogPage() {}

/****************** ROW FORM PAGE ********************************/
function showRowFormPage() {}
function hideRowFormPage() {}

/****************** MODAL PAGE ********************************/
function showModalPage() {}
function hideModalPage() {}


/****************** SPREADSHEET FUNCTIONS *********************/


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






