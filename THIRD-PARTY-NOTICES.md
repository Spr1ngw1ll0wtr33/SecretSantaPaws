# Third-party notices

Secret Santa Paws itself is under the MIT licence (see `LICENSE`). It also uses the following.

## SheetJS Community Edition 0.18.5

- **File:** `xlsx.full.min.js` (bundled, unchanged)
- **Used for:** reading the participants spreadsheet and writing the master list
- **Copyright:** (C) 2012-present SheetJS LLC
- **Licence:** Apache License 2.0. A copy is in [`licenses/Apache-2.0.txt`](licenses/Apache-2.0.txt).
- **Source:** https://sheetjs.com and https://www.npmjs.com/package/xlsx

Note: newer SheetJS versions are published on SheetJS's own site (cdn.sheetjs.com) and fix some known security issues in 0.18.5. Here the app only ever opens a spreadsheet the organiser has chosen themselves, so the risk is very low, but if you adapt the app to open files from other people, consider upgrading.

## Google Fonts

- **Fonts:** Nunito and Mountains of Christmas
- **How:** loaded from fonts.googleapis.com when the page opens. They are not copied into this repository.
- **Licence:** SIL Open Font Licence 1.1

## Header illustration

- **File:** `header.jpg`
- **Made with:** Google Gemini (AI image generation)
- Included for use with this app. AI-generated images may not be protected by copyright, so no rights in it are claimed beyond what the law allows. Swap in your own picture if you prefer.
