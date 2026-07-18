# MHT Viewer for Firefox

A lightweight, purely local WebExtension for Firefox that allows you to view `.mht` and `.mhtml` files right in your browser. 

Since modern versions of Firefox dropped native support for MHT files (and older add-ons like UnMHT no longer work), this extension bridges the gap using a purely JavaScript-based parser to decode and render the files.

## Features
- **Offline & Private:** Parses files entirely locally on your machine. No data is sent to any server.
- **Cross-compatible:** Works on both Firefox Desktop and Firefox for Android.
- **Multilingual:** Automatically supports English and Spanish based on your browser settings.

## How to Install
1. Go to `about:debugging` in Firefox.
2. Click **This Firefox** -> **Load Temporary Add-on...**
3. Select the `manifest.json` or `.xpi` file in this directory.

## How to Use
- Click the extension icon in your toolbar (or in the Android menu) to open the Viewer tab.
- Drag and drop an `.mht` file anywhere on the page, or click "Select File".
