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

async function UpdateSpreadsheets() {
    const status = await checkAuthentication();
    fetchAvailableSpreadsheets(status);
}

module.exports = {
    fetchAvailableSpreadsheets,
    UpdateSpreadsheets
};
  