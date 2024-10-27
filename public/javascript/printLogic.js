const path = require('path');
const { ipcRenderer, shell, app } = require('electron');
const { PDFDocument } = require('pdf-lib');
const sheetBool;

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
      const dateTexted = innerGlobalData[13] ? innerGlobalData[13] : formatDate(new Date()); // calls the function that sets undefined in 'date ordered' to current date

      // Order globalData[] into a new array
      const orderedGlobalData = [
        innerGlobalData[2],  // Full name
        innerGlobalData[7],  // Quote
        innerGlobalData[3],  // Contact
        innerGlobalData[8],  // Deposit
        innerGlobalData[4],  // Model
        innerGlobalData[6],  // Colour
        innerGlobalData[5],  // Part
        innerGlobalData[9] !== "No" ? "Yes" : innerGlobalData[9], // Warranty
        innerGlobalData[11], // Date Ordered
        innerGlobalData[13] = dateTexted, // Date Ordered
        innerGlobalData[10]  // Notes
      ];

      const dataLabel = [
        "DATE:",     // 0
        "NAME:",     // 1
        "CONTACT:",  // 2
        "MODEL:",    // 3
        "PART:",     // 4
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

      console.log("ORDERED GLOBAL DATA: ", orderedGlobalData);


      if (!sheetBool) {
        //Accessories Data
        const data = [
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
      }
      else {
        //Parts Data
        const data = [
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


      } 
      console.log("FULL DATA[]: ", data);
      // Generate the label and store the generated PDF
      const pdf = await generateLabel(data);
      if (pdf) {
        pdfs.push(pdf);  // Store the generated PDF if it's valid
      } else {
        console.error(`Failed to generate PDF for key: ${key}`);
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
    const backgroundImage = img64;
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
    const xOffset = 1;   // 1mm shifft to the right
    const yOffset = 1.5; // 1.5mm shift down


    fetch(backgroundImage)
      .then(response => response.text())
      .then(base64String => {
        const img = base64String;  // Now 'img' contains the base64 string
        document.getElementById('image').src = img;  // Use the Base64 string as the src for the image
      })
      .catch(error => console.error('Error loading Base64 image:', error));

    // Draw a black border around the label
    const borderX = 0.5 + xOffset;  // Adjusted for xOffset
    const borderY = 0.5 + yOffset;  // Adjusted for yOffset
    const borderWidth = 89 - 7.5;      // Full label width
    const borderHeight = 36 - 3;     // Full label height

    // Add the background image (adjust the x, y, width, height as needed)
    pdf.addImage(backgroundImage, 'JPEG', -xOffset, -yOffset, 89, 36);


    // Set the border color (black)
    pdf.setDrawColor(0);  // 0 is black
    pdf.setLineWidth(1);  // Set stroke thickness to 2mm

    // Draw the rectangle (border) - no fill, just stroke
    pdf.rect(borderX, borderY, borderWidth, borderHeight, 'S');  // 'S' stands for "stroke"

    pdf.setFontSize(8.5);

    const fullWidth = borderWidth - 4; // Leave some padding from both sides

    // Full label, split in 2 columns
    const columnWidth = 44;  // Total width for one column (either left or right)

    // Label Columns (for dataLabel[])
    const lblColumnWidth = 20;  // Width of the label column (e.g., "Name:", "Contact:")

    // Data Columns (for globalData[])
    const dataColumnWidth = columnWidth - lblColumnWidth;  // Remaining space for the actual data

    // Left side columns (Label and Data)
    const lblLeftColumnX = 1.75 + xOffset;  // Starting X position for the left label column
    const dataLeftColumnX = lblLeftColumnX + lblColumnWidth;  // Starting X position for the left data column

    // Right side columns (Label and Data)
    const lblRightColumnX = fullWidth / 2 + 6.5;  // Right label column starts after left data column with a small gap
    const dataRightColumnX = lblRightColumnX + lblColumnWidth;  // Right data column starts after right label column

    let currentY = 3.75 + yOffset;  // Start slightly lower + offset to avoid overlapping with the border

    let remainingNotes = [];

    for (let i = 0; i < data.length; i += 2) {
      const leftLabelText = data[i].label;
      const leftDataText = data[i].value;

      const leftLabelWidth = pdf.getTextWidth(leftLabelText) + 0.5;  // Width of the left label
      const leftDataWidth = lblRightColumnX - leftLabelWidth;  // Width available for the left data

      // Wrap left label and data
      const leftLabelWrappedText = pdf.splitTextToSize(leftLabelText, leftLabelWidth);
      const leftDataWrappedText = pdf.splitTextToSize(leftDataText, leftDataWidth - 1.75);

      // Print left label
      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "bold");
      pdf.text(leftLabelWrappedText, lblLeftColumnX, currentY);

      let notesHeight = 0; // Variable to hold height for notes if applicable

      // Special handling for "NOTES:"
      if (leftLabelText === "NOTES:") {
        const wrappedNotesText = pdf.splitTextToSize(leftDataText, leftDataWidth - 5);

        // Print first line of notes
        if (wrappedNotesText.length > 0) {
          pdf.setFontSize(8.5);
          pdf.setFont("helvetica", "normal");
          pdf.text(wrappedNotesText[0], lblLeftColumnX + leftLabelWidth, currentY);
          remainingNotes = wrappedNotesText.slice(1);
          console.log(remainingNotes);
        }
      } else {
        // For other labels, print the left data
        pdf.setFontSize(8.5);
        pdf.setFont("helvetica", "normal");
        pdf.text(leftDataWrappedText, lblLeftColumnX + leftLabelWidth, currentY);
      }

      // Right label and data handling
      let rightRowHeight = 0; // Initialize to track right row height
      if (i + 1 < data.length) {
        const rightLabelText = data[i + 1].label;
        const rightDataText = data[i + 1].value;

        const rightLabelWidth = pdf.getTextWidth(rightLabelText) + 0.5; // Width of the right label
        const rightDataWidth = columnWidth - rightLabelWidth; // Width available for right data

        // Wrap right label and data
        const rightLabelWrappedText = pdf.splitTextToSize(rightLabelText, rightLabelWidth);
        const rightDataWrappedText = pdf.splitTextToSize(rightDataText, rightDataWidth);

        // Print right label
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "bold");
        pdf.text(rightLabelWrappedText, lblRightColumnX, currentY);

        // Special handling for "REMINDERS:"
        if (rightLabelText === "REMINDERS:") {
          const lineWidth = 18; // Width of each line
          const lineY = 3; // Height of each line
          const spacing = 0.5; // Spacing between lines
          pdf.setLineWidth(0.2); // Set stroke thickness

          // Draw lines for reminders
          const lineX = lblRightColumnX + rightLabelWidth - 1; // Position after the label
          const lineYStart = currentY; // Align with text baseline

          // Draw 3 lines for reminders
          for (let j = 0; j < 3; j++) {
            pdf.line(lineX, lineYStart + (lineY + spacing) * j, lineX + lineWidth, lineYStart + (lineY + spacing) * j);
          }
          rightRowHeight += 3 * (lineY + spacing); // Add height for reminders
        } else {
          // Print right data
          pdf.setFontSize(8.5);
          pdf.setFont("helvetica", "normal");
          pdf.text(rightDataWrappedText, lblRightColumnX + rightLabelWidth - 1, currentY);
          rightRowHeight += rightDataWrappedText.length * 2; // Increment height based on data
        }
      }

      // Calculate the height for the current row
      const leftRowHeight = leftLabelWrappedText.length * 2 + notesHeight; // Include notes height
      currentY += Math.max(leftRowHeight, rightRowHeight) + 2; // Move to the next row, ensuring enough space for notes and reminders
    }

    /// Print the rest of the notes
    if (remainingNotes.length > 0) { // Check if there are remaining notes to print
      const remainingNotesXPosition = lblLeftColumnX; // Starting X position for remaining notes
      const remainingNotesWidth = fullWidth - 24; // Width for remaining notes

      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "normal");

      // Join remaining notes into a single string, then wrap once
      const remainingNotesText = remainingNotes.join(" "); // Join with newline for splitting
      const remainingNotesWrapped = pdf.splitTextToSize(remainingNotesText, remainingNotesWidth);
      // Print each wrapped line of remaining notes using a traditional for loop
      for (let i = 0; i < remainingNotesWrapped.length; i++) {
        const line = remainingNotesWrapped[i]; // Get the current line
        pdf.text(line, remainingNotesXPosition, currentY - 10 + (i * 3)); // Adjust Y position for each line
      }
    }
    return pdf;
  } catch {
    console.log("Error generating label", error);
    return null;
  }
}

module.exports = {
  printLabel,
  printPDF,
  sheetBool,
};
