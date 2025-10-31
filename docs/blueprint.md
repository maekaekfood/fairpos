# **App Name**: StockMaster POS

## Core Features:

- Add Stock Item: Initiate the process of adding a new stock item.
- Barcode Scan (Conditional): After 'Add Stock Item', prompt the user for whether item has a barcode; if so, enable the device camera to scan and read the barcode to populate details.
- Product Photo Capture: After barcode details (if available), the app opens device camera for taking a product photo. Photo is cropped and displayed with true-aspect ratio preview before upload.
- Google Drive Storage: Upload and store product photos to the specified Google Drive folder (https://drive.google.com/drive/folders/1H7krY1kmrY4FB4fhyGpIOLnEJZf2o4XE).
- Stock Item Management: Store and manage all product data using Firebase.
- Product Suggestions: Use an AI tool that reasons when product descriptions might be supplemented with suggested details (brands, alternative names, or missing information) based on available information. This will save the user time and effort, improve catalog consistency, and make product discovery easier.

## Style Guidelines:

- Primary color: Deep Blue (#3F51B5) for trust and reliability.
- Background color: Light Gray (#F5F5F5) for a clean, neutral backdrop.
- Accent color: Teal (#009688) for highlights and calls to action.
- Body and headline font: 'PT Sans' (sans-serif) for a modern and readable experience.
- Use clear, minimalistic icons for common actions like 'add,' 'scan,' and 'upload.'
- Maintain a clean, organized layout for easy navigation.
- Subtle animations for transitions and feedback to enhance user experience.