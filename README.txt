Google sheets to dymo (STD)

An Electron app powered by 
  Express
  Node

Function
  Fetch row data from spreadsheets available in a users
  Google Drive, then print that data on a DYMO label.

To Build From Source
  Obtain OAuth2 credentials from the Google Cloud Console
    as a .json, name it credentials.json and put it in the
    source directory
  Make sure NodeJS is installed
  Open terminal in source directory
    # npm install
    # npm run build

  The applications setup.exe is now available in ./dist
  this .exe can be distributed on a USB or made available
  for download.

ToDo
  Implement MessageMedia API for automated customer texting
  General polish
  Refactor spaghetti code




