## Document Scanner (Expo SDK 54)

Simple React Native + Expo frontend-only document scanner UI.

### Tech stack

- **Expo**: SDK 54 (managed workflow)
- **React Native**: 0.81
- **React**: 19.1
- **Navigation**: `@react-navigation/native` + bottom tabs

### App structure

- **Dashboard**: Landing screen with:
  - Quick Scan card with "Scan from Camera" and "Import from Files" buttons (no actual functionality wired up)
  - Smart suggestion tiles (receipts, contracts, export as PDF, share)
- **History**: Static list of example scanned documents with titles, tags, dates, and page counts.

All actions are non-functional placeholders; this project is only the UI shell.

### Getting started

1. **Install dependencies**

   ```bash
   cd /home/abdi/Documents/DocumentScanner
   npm install
   ```

2. **Run the Expo dev server**

   ```bash
   npx expo start
   ```

3. Open the app in an emulator or on a physical device via Expo Go.

### Tesseract OCR setup (required for document analysis)

Create a `.env` file in the project root and add:

```bash
EXPO_PUBLIC_OCR_SPACE_API_KEY=your_ocr_space_api_key
```

Notes:
- OCR uses **Tesseract.js** directly on Expo Web.
- On iOS/Android in Expo Go, the app uses OCR.Space with **Tesseract engine** (`OCREngine=2`) as fallback.
- If no key is set, the app falls back to OCR.Space demo key (`helloworld`) with strict limits.

Then restart Expo (`npx expo start -c`) so the env variable is loaded.

### Post-scan editor

After OCR preview appears:

- Tap **Edit** to open the full document editor.
- Update template rows (passport/invoice/etc), body text, and tags.
- Use style controls (bold/italic/underline, alignment, font size) with live preview.
- Tap **Apply** to return to scan preview, then **Export**.

### Export formats

From scan preview, choose your preferred export format, then tap **Export**.

Supported formats:
- **PDF**
- **DOC**
- **JPG**
- **PNG**
- **TXT**
- **JSON**

After export, the app opens the system share sheet (when available) so you can send or save the file.

On Android, you can also tap **Export to Files** to choose a folder in Android File Manager and save the exported file directly there.

