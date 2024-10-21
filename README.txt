Google sheets to dymo (STD)

Install NodeJS, this will include npm (Node Package Manager)

You have to create a service account through Google Developers
follow this: https://developers.google.com/workspace/guides/create-credentials

Then download the credential file as credentials.json 
and replace the existing credentials.json file

git clone https://github.com/thedeserttoad/std 
open terminal at folder location
npm install
npm start

in a browser, goto
http://localhost:3000


todo
  - fix base64 image loading, can be done in file but that's gross
  - aesthetics
  
Known bugs
- Row form input broken after adding spreadsheets
- Available spreadsheets form wider after opening spreadsheet management
