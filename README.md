# ProdTab

ProdTab is a lightweight new tab / startpage extension built with plain HTML, CSS, and JavaScript.

https://github.com/user-attachments/assets/73f0ba5b-c89c-405a-8453-f13f7d679eb3

It focuses on a clean daily dashboard with:

- Personalized onboarding (name + city)
- Time-based greeting
- Dynamic weather using your chosen city
- Search input
- Bookmark cards with hover actions (edit/delete)
- Light and dark mode toggle

All data is stored locally in your browser via `localStorage`.

## Inspiration & Credit

This project is inspired by work from the original author:

- https://github.com/snes19xx

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript
- Open-Meteo APIs (geocoding + forecast)

## Installation

### Chromium-based Browsers (Chrome, Edge, Brave, Arc, Vivaldi, etc.)

Use the unpacked extension flow:

1. Download or clone this repository.
2. Open your browser extension page:
	- Chrome: `chrome://extensions`
	- Edge: `edge://extensions`
	- Brave: `brave://extensions`
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `ProdTab` project folder (the folder that contains `manifest.json`).
6. Open a new tab to use ProdTab.

### Firefox-based Browsers (Firefox and derivatives)

Choose one of the following:

1. Install from the Firefox Add-ons store (recommended):
	- https://addons.mozilla.org/en-US/firefox/addon/prodtab
2. Manually load the extension:
	- Open `about:debugging#/runtime/this-firefox`
	- Click **Load Temporary Add-on...**
	- Select the `manifest.json` file from this project

## Local Development

1. Clone the repository.
2. Open `index.html` directly in a browser, or load the folder as an unpacked extension for new-tab behavior.

## Notes

- No backend is used.
- No external database is used.
- User preferences are persisted locally.

## License

See `LICENSE`.
