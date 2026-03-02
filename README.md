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

3. Build and run with a development build (`npx expo run:android` or `npx expo run:ios`).

### Google ML Kit setup (required for document analysis)

This app now uses on-device OCR with Google ML Kit (`react-native-mlkit-ocr`), so no API key is required.

Because this is a native module, use an Expo development build (Expo Go will not load this module).

1. Generate native projects:

```bash
npx expo prebuild
```

2. Run Android build:

```bash
npx expo run:android
```

3. For iOS (macOS only), install pods then run:

```bash
npx expo run:ios
```

The analyzer returns `document_type`, `language`, `tags`, `fields`, and `summary` using OCR text + local heuristics.

