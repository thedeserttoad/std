const path = require('path');
const { ipcRenderer, shell, app } = require('electron');
const { PDFDocument } = require('pdf-lib');
const { SheetSelection } = require('./sheetbool');
let dateOrderedDataIndex;
let notesDataIndex;
let dateTextedDataIndex;
//const { SheetSelection } = require(path.join(appPath, 'public', 'javascript', 'sheetbool.js')); // Adjust the path as necessary

const printPDF = async (pdfs) => {
  console.log("pdfs array = ", pdfs);
  try {
    // Create an array to hold the buffers for merging
    const pdfBuffers = [];

    for (const pdf of pdfs) {
      console.log("pdfs[i] = ", pdf);
      // Generate the PDF blob
      const pdfBlob = pdf.output('blob');

      // Convert the blob to an array buffer
      const buffer = await pdfBlob.arrayBuffer();

      // Push the buffer to the array
      pdfBuffers.push(buffer);
    }

    // Merge the PDFs
    const mergedPdf = await mergePDFs(pdfBuffers);

    // Send the merged PDF data to the main process for printing
    await ipcRenderer.invoke('print-label', mergedPdf);
  } catch (err) {
    console.error('Error printing label:', err);
  }
};

async function mergePDFs(pdfArray) {
  // Create a new PDF document
  const mergedPdf = await PDFDocument.create();

  for (const pdfBuffer of pdfArray) {
      // Load each PDF
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      
      // Add each page from the loaded PDF to the merged document
      pages.forEach((page) => mergedPdf.addPage(page));
  }

  // Save the merged PDF to a buffer
  const mergedPdfFile = await mergedPdf.save();

  // You can then save it to the filesystem or return it as a response
  return mergedPdfFile;
}

const formatDate = (date) => { // function that sets undefined in 'date ordered' to current date
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const year = String(date.getFullYear()); // Use full year
  return `${day}/${month}/${year}`;
};

const printLabel = async (dataObject) => {
  
  console.log("DataObject in PrintLabel(): ", dataObject);
  try {
    if (!dataObject || dataObject.length === 0) {
      throw new Error('No data available to print.');
    }
    console.log("Before for loop");
    
    // Store generated PDFs
    const pdfs = [];
    
    for (let key in dataObject) {
      console.log("After for loop");
      let innerGlobalData = dataObject[key];
      
      console.log("testing hahahahahahahahahah");
      const isPartsSelected = SheetSelection();
      let data = [];
    
      if (isPartsSelected) {
        
        dateOrderedDataIndex = 11;
        notesDataIndex = 10;
        dateTextedDataIndex = 13;
        console.log(isPartsSelected);

      } else {

        dateOrderedDataIndex = 10;
        notesDataIndex = 9;
        dateTextedDataIndex = 12;
        console.log(isPartsSelected);

      }

      // Order globalData[] into a new array
      const orderedGlobalData = [
        innerGlobalData[2],  // Full name
        innerGlobalData[7],  // Quote
        innerGlobalData[3],  // Contact
        innerGlobalData[8],  // Deposit
        innerGlobalData[4],  // Model
        innerGlobalData[6],  // Colour
        innerGlobalData[5],  // Part
        innerGlobalData[9] !== "No" ? "Yes" : innerGlobalData[9], // Warranty. Value, condition, outcome : else do
        innerGlobalData[dateOrderedDataIndex], // Date Ordered
        innerGlobalData[dateTextedDataIndex], //= dateTexted, // Date Texted
        innerGlobalData[notesDataIndex]  // Notes
      ];

      // Logging innerGlobalData
      for (let i = 0; i < innerGlobalData.length; i++) {
        console.log(`InnerGlobalData[${i}] = ${innerGlobalData[i]}`);
      }

      // Logging orderedGlobalData
      for (let i = 0; i < orderedGlobalData.length; i++) {
        console.log(`OrderedGlobalData[${i}] = ${orderedGlobalData[i]}`);
      }

      const dataLabel = [
        "DATE:",     // 0
        "NAME:",     // 1
        "CONTACT:",  // 2
        "MODEL:",    // 3
        "PART/ACC:",     // 4
        "COLOUR:",   // 5
        "QUOTE:",    // 6
        "DEPOSIT:",  // 7
        "REMAINING:",// 8
        "WARRANTY:", // 9
        "DATE ORDERED:", // 10
        "DATE TEXTED:",  // 11
        "REMINDERS:",    // 12
        "NOTES:",        // 13
        " "              // 14
      ];

      //console.log("ORDERED GLOBAL DATA: ", orderedGlobalData);

      //Final data table for label generation
      if (isPartsSelected) {
        //Parts Table
        data = [
          { label: dataLabel[1], value: orderedGlobalData[0] },  // Full Name
          { label: dataLabel[6], value: "" + orderedGlobalData[1] },  // Quote
          { label: dataLabel[2], value: orderedGlobalData[2] },  // Contact
          { label: dataLabel[7], value: "" + orderedGlobalData[3] },  // Deposit
          { label: dataLabel[3], value: orderedGlobalData[4] },  // Model
          { label: dataLabel[5], value: orderedGlobalData[5] },  // Colour
          { label: dataLabel[4], value: orderedGlobalData[6] },  // Part
          { label: dataLabel[9], value: orderedGlobalData[7] },  // Warranty
          { label: dataLabel[10], value: orderedGlobalData[8] }, // Date Ordered
          { label: dataLabel[11], value: orderedGlobalData[9] }, // Date Texted
          { label: dataLabel[13], value: orderedGlobalData[10] },// Notes
          { label: dataLabel[12], value: "" }                   // Reminders (no value)
        ];
      } else {
        //Accessories Table
        data = [
          { label: dataLabel[1], value: orderedGlobalData[0] },  // Full Name
          { label: dataLabel[6], value: "" + orderedGlobalData[1] },  // Quote
          { label: dataLabel[2], value: orderedGlobalData[2] },  // Contact
          { label: dataLabel[7], value: "" + orderedGlobalData[3] },  // Deposit
          { label: dataLabel[3], value: orderedGlobalData[4] },  // Model
          { label: dataLabel[5], value: orderedGlobalData[5] },  // Colour
          { label: dataLabel[4], value: orderedGlobalData[6] },  // Part
          { label: " ", value: " " },  // Warranty
          { label: dataLabel[10], value: orderedGlobalData[8] }, // Date Ordered
          { label: dataLabel[11], value: orderedGlobalData[9] }, // Date Texted
          { label: dataLabel[13], value: orderedGlobalData[10] },// Notes
          { label: dataLabel[12], value: "" }                   // Reminders (no value)
        ];
      }


      console.log("FULL DATA[]: ", data);
      // Generate the label and store the generated PDF
      const pdf = await generateLabel(data);
      if (pdf) {
        pdfs.push(pdf);  // Store the generated PDF if it's valid
      } else {
        console.error("Failed to generate PDF for key: ${key}");
      }
    }

    // Now that all PDFs are generated, call printPDF() with all necessary data
    await printPDF(pdfs);  // Adjust the call based on how printPDF() accepts data

  } catch (err) {
    console.error('Error printing label:', err);
  }
};

const generateLabel = async (data) => {
  try {
    const backgroundImage = img64; // Assuming img64 is defined elsewhere
    console.log('Data Available for Printing: ', data);
    if (!data || data.length === 0) {
      throw new Error('No data available to print.');
    }

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [36, 89],
    });

    // Adjustments for misalignment
    const xOffset = 1;   // 1mm shift to the right
    const yOffset = 1.5; // 1.5mm shift down

    // Draw a black border around the label
    const borderX = 0.5 + xOffset;
    const borderY = 0.5 + yOffset;
    const borderWidth = 89 - 7.5;
    const borderHeight = 36 - 3;

    pdf.addImage(backgroundImage, 'JPEG', 53, 23, 33, 13);
    
    // Set the border color (black)
    pdf.setDrawColor(0);
    pdf.setLineWidth(1);
    pdf.rect(borderX, borderY, borderWidth, borderHeight, 'S');

    pdf.setFontSize(8.5);
    const fullWidth = borderWidth - 4; // Leave some padding from both sides
    const columnWidth = 44;  // Total width for one column (either left or right)
    const lblColumnWidth = 20;  // Width of the label column

    const lblLeftColumnX = 1.75 + xOffset;
    const dataLeftColumnX = lblLeftColumnX + lblColumnWidth;
    const lblRightColumnX = fullWidth / 2 + 6.5;
    const dataRightColumnX = lblRightColumnX + lblColumnWidth;

    let currentY = 3.75 + yOffset;

    const truncateText = (text, width) => {
      const ellipsis = "...";
      let textWidth = pdf.getTextWidth(text);
      
      // Check if the text already fits
      if (textWidth <= width) return text;
    
      // Remove characters one by one until it fits
      while (textWidth > width && text.length > 0) {
        text = text.slice(0, -2); // Remove the last character
        textWidth = pdf.getTextWidth(text + ellipsis); // Check width with ellipsis
      }
      
      // If we have truncated the text, add ellipsis
      return text + ellipsis; // Always add ellipsis when truncated
    };
    
    for (let i = 0; i < data.length; i += 2) {
      const leftLabelText = data[i].label;
      const leftDataText = data[i].value;

      const leftLabelWidth = pdf.getTextWidth(leftLabelText) + 0.5;
      const leftDataWidth = lblRightColumnX - leftLabelWidth;

      // Truncate left data if it's too long
      const truncatedLeftDataText = truncateText(leftDataText, leftDataWidth - 1.75);
      
      // Print left label
      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "bold");
      pdf.text(leftLabelText, lblLeftColumnX, currentY);
      
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "normal");

      if (i < 10) {

      pdf.text(truncatedLeftDataText, lblLeftColumnX + leftLabelWidth, currentY);

      }

      // Special handling for "NOTES:"
      if (leftLabelText === "NOTES:") {
        const notesWidth = fullWidth - 10; // Set a wider width for notes
        const truncatedNotesText = truncateText(leftDataText, notesWidth); // Allow more characters for notes
        pdf.text(truncatedNotesText, lblLeftColumnX + leftLabelWidth, currentY);
        currentY += 4; // Space below notes
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "bold");
        pdf.text("REMINDERS:", lblLeftColumnX, currentY);
        

        const lineWidth = 10; // Width of each line
        const lineYStart = currentY + 2; // Position for lines
        pdf.setLineWidth(0.2); // Set stroke thickness

// Calculate starting position for lines based on the label
        const initialLineXStart = lblLeftColumnX + pdf.getTextWidth("REMINDERS: ") + 0.5; // Starting position after the label

// Draw 3 horizontal lines for reminders
for (let j = 0; j < 3; j++) {
    const lineXStart = initialLineXStart + (j * (lineWidth + 2)); // Increment X for each line
    pdf.line(lineXStart, lineYStart, lineXStart + lineWidth, lineYStart); // Keep Y position the same
}

// Optional: Adjust the currentY if you need space below the lines
currentY += 10; // Modify this if you need a different gap below

      }

      // Now handle right column data
      let rightRowHeight = 0;
      if (i + 1 < data.length) {
        const rightLabelText = data[i + 1].label;
        const rightDataText = data[i + 1].value;

        const rightLabelWidth = pdf.getTextWidth(rightLabelText) + 0.5;
        const rightDataWidth = columnWidth - rightLabelWidth;

        // Print right label
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "bold");
        pdf.text(rightLabelText, lblRightColumnX, currentY);

        // Print right data
        pdf.setFontSize(8.5);
        pdf.setFont("helvetica", "normal");
        const truncatedRightDataText = truncateText(rightDataText, rightDataWidth);
        pdf.text(truncatedRightDataText, lblRightColumnX + rightLabelWidth - 1, currentY);
        rightRowHeight += pdf.getTextDimensions(truncatedRightDataText).h; // Adjust height based on truncated data
      }

      // Calculate the height for the current row
      const leftRowHeight = 2; // Standard row height
      currentY += Math.max(leftRowHeight, rightRowHeight) + 1;
    }

    return pdf;
  } catch (error) {
    console.log("Error generating label", error);
    return null;
  }
};


module.exports = {
    printLabel,
    printPDF,
};