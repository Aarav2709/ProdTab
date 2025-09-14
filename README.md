# About MoodsWeb

MoodsWeb is a Firefox browser extension that transforms your new tab page into a minimalist journaling interface. Each time you open a new tab, you'll see a thoughtful reflection question and a space to record your thoughts.

## Features

- ✨ **Daily Reflection Questions** - Rotating questions to inspire mindful reflection
- 💾 **Local Data Storage** - All entries are saved securely using Firefox's storage API
- 📱 **Responsive Design** - Clean, minimalist interface that works on all screen sizes
- 📚 **History View** - Browse all your past reflections organized by date
- 📤 **Export Options** - Download your reflections as JSON or text files
- 🔒 **Privacy First** - All data stays on your device, nothing is sent to external servers

## Installation Instructions

### Method 1: Development Installation (Recommended for testing)

1. Open Firefox
2. Navigate to `about:debugging`
3. Click "This Firefox" in the sidebar
4. Click "Load Temporary Add-on..."
5. Navigate to the `extension` folder and select `manifest.json`
6. The extension will be loaded temporarily

### Method 2: Permanent Installation (Manual)

1. Package the extension:
   - Navigate to the `extension` folder
   - Select all files (manifest.json, index.html, script.js, etc.)
   - Create a ZIP file named `moodsweb.xpi`
2. In Firefox:
   - Navigate to `about:addons`
   - Click the gear icon and select "Install Add-on From File..."
   - Select your `moodsweb.xpi` file
   - Approve the installation

## File Structure

```
extension/
├── manifest.json       # Extension configuration (manifest v2)
├── index.html         # Main new tab interface
├── script.js          # Main page functionality
├── style.css          # Styling for all pages
├── history.html       # History page interface
├── history.js         # History page functionality
└── icons/            # Extension icons (add your own)
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    ├── icon-96.png
    └── icon-128.png
```

## Usage

1. **Open a new tab** - You'll see today's reflection question
2. **Write your thoughts** - Use the text area to record your reflection
3. **Save your entry** - Click "Save Reflection" or use Ctrl/Cmd + Enter
4. **View your history** - Click "View History" to see all past entries
5. **Export your data** - Use the export buttons to download your reflections

## Features in Detail

### Daily Questions

The extension includes 20 thoughtfully crafted reflection questions that rotate daily:

- "What are you grateful for today?"
- "What's on your mind?"
- "What's one small win you had today?"
- And 17 more inspiring prompts...

### Data Storage

- Uses Firefox's `browser.storage.local` API for reliable data persistence
- All data remains on your device - complete privacy
- Automatic saving with visual feedback
- Data survives browser restarts and updates

### Export Options

- **JSON Export**: Technical format for backup and data portability
- **Text Export**: Human-readable format perfect for printing or sharing

### Statistics

The history page shows:

- Total number of reflections
- Current streak of consecutive days
- Total days active

## Customization

You can easily customize the extension by modifying:

- **Questions**: Edit the `REFLECTION_QUESTIONS` array in `script.js`
- **Styling**: Modify CSS variables in `style.css` for colors and typography
- **Layout**: Adjust HTML structure in `index.html` and `history.html`

## Browser Compatibility

- **Firefox**: Full support (manifest v2)
- **Chrome/Edge**: Requires minor manifest modifications for v3 compatibility

## Privacy & Security

- No external network requests
- No user tracking or analytics
- All data stored locally using secure browser APIs
- No permissions required beyond storage access

## Support

For issues or feature requests, please visit the project repository on GitHub.

## License

This project is open source. See LICENSE file for details.
