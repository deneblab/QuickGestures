# 🖱️ QuickGestures

> **Transform your browsing with intuitive mouse gestures**

A powerful Chrome extension that brings fluid mouse gesture navigation to your browser. Draw simple patterns to navigate, manage tabs, search text, and control your browsing experience like never before.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285f4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chrome.google.com/webstore)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)]()
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green?style=for-the-badge)]()

---

## ✨ Key Features

### 🎯 **Multi-Context Gestures**
- **Page Gestures** - Right-click gestures for page navigation
- **Link Gestures** - Direct link manipulation without modifiers  
- **Selection Gestures** - Text-specific actions on selected content

### 🚫 **Site Exclusions**
- Wildcard pattern support (`*.example.com/*`)
- Flexible URL matching for selective disabling
- Real-time exclusion updates

### 👁️ **Visual Feedback**
- Real-time gesture overlay with customizable colors
- Live gesture name display during drawing
- Context indicators and visual confirmations
- High contrast mode for accessibility

### 📑 **Tab Order Control**
- Configure where new tabs open (right/left of current, far right, or default)
- Control new tab state (foreground, background, or default)
- Choose focus behavior after closing a tab (left, right, last active, or default)

### ⚙️ **Fully Customizable**
- Complete gesture mapping editor
- Visual arrow symbols (⬅➡⬆⬇) instead of letters
- Adjustable sensitivity and thresholds
- Custom search engine integration

---

## 🚀 Quick Start

### Installation
1. **Clone the repository**
   ```bash
   git clone https://github.com/DenebLab/QuickGestures.git
   cd QuickGestures
   ```

2. **Build the extension**
   ```bash
   npm install
   npm run build
   ```

3. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" → Select `dist` folder

### Basic Usage
1. **Page Navigation**: Right-click and drag
   - ⬅ Go back | ➡ Go forward | ⬆ Scroll top | ⬇ Scroll bottom

2. **Link Actions**: Left-click and drag on any link
   - ➡ Open in background | ⬅ Open in foreground | ⬆ Open in new window

3. **Text Operations**: Select text, then left-click and drag
   - ➡ Search in new tab | ⬅ Search current tab

---

## 📋 Default Gesture Maps

<details>
<summary><strong>🌐 Page Gestures (Right Mouse Button)</strong></summary>

| Gesture | Action | Description |
|---------|--------|-------------|
| ⬅ | Go Back | Navigate to previous page |
| ➡ | Go Forward | Navigate to next page |
| ⬆ | Scroll Top | Jump to top of page |
| ⬇ | Scroll Bottom | Jump to bottom of page |
| ⬅➡ | New Tab | Open new tab |
| ➡⬅ | Close Tabs Right | Close tabs to the right |
| ⬇⬆ | Reopen Tab | Restore last closed tab |
| ⬇➡ | Close Tab | Close current tab |
| ⬆⬅ | Switch Tab Left | Move to previous tab |
| ⬆➡ | Switch Tab Right | Move to next tab |

</details>

<details>
<summary><strong>🔗 Link Gestures (No modifier required)</strong></summary>

| Gesture | Action | Description |
|---------|--------|-------------|
| ➡ | Background Tab | Open link in background tab |
| ⬅ | Foreground Tab | Open link in foreground tab |
| ⬆ | New Window | Open link in new window |

</details>

<details>
<summary><strong>📝 Selection Gestures (No modifier required)</strong></summary>

| Gesture | Action | Description |
|---------|--------|-------------|
| ➡ | Search New Tab | Search selected text in new tab |
| ⬅ | Search Current | Search selected text in current tab |

</details>

---

## ⚙️ Configuration

### Appearance Settings
- **Line Color**: Customize gesture trail color
- **Line Width**: Adjust trail thickness (1-10px)
- **High Contrast**: Enhanced visibility mode
- **Show Context Chip**: Display context indicators
- **Show Gesture Name**: Real-time gesture name display

### Context Controls
- **Page Gestures**: Enable/disable right-click gestures
- **Link Gestures**: Enable/disable link-specific actions
- **Selection Gestures**: Enable/disable text selection actions
- **Movement Thresholds**: Adjust sensitivity settings

### Tab Order
- **On tab open — Position**: Follow default, right of current tab, left of current tab, far right end
- **On tab open — State**: Follow default, open in foreground, open in background
- **After tab close — Position**: Follow default, go to left tab, go to right tab, go to last active tab

### Site Exclusions
- Add wildcard patterns to disable gestures on specific sites
- Examples: `*.test.com/*`, `https://example.com/admin/*`
- Real-time pattern matching and updates

---

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Chrome browser

### Setup
```bash
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build

# Clean build artifacts
npm run clean
```

### Documentation
Project documentation available in [`docs/`](docs/):
- [Installation Guide](docs/installation.md) - Detailed installation instructions
- [Privacy Policy](docs/privacy-policy.md) - Privacy compliance and user data handling


### Key Technologies
- **TypeScript** - Type-safe development
- **esbuild** - Fast bundling and compilation
- **Chrome Extensions API** - Manifest V3 compliance
- **Canvas API** - Gesture visualization
- **Chrome Storage** - Settings persistence

---

## 🔒 Privacy & Security

QuickGestures is designed with privacy in mind:

- ✅ **100% Local Processing** - All gesture recognition happens locally
- ✅ **No Data Collection** - No analytics or tracking
- ✅ **No External Requests** - No communication with external servers
- ✅ **Open Source** - Full code transparency
- ✅ **Minimal Permissions** - Only essential Chrome APIs used

### Required Permissions
- `storage` - Save your gesture settings and preferences locally
- `tabs` - Tab management actions (new, close, switch, reopen) and tab order control
- `scripting` - Gesture detection and page interactions (scrolling)
- `activeTab` - Current page gesture capture and visual feedback
- `sessions` - Restore recently closed tabs with reopen gesture
- **Website Access** (`http://*/*`, `https://*/*`) - Enable gestures on all sites

**🔒 Privacy**: All processing is local - no data collection, tracking, or external communication.  
**📖 Details**: See [privacy-policy.md](docs/privacy-policy.md) for complete privacy information.

---

## 💡 Feature Requests
- Check existing [issues](../../issues) first
- Describe the use case and expected behavior

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by classic mouse gesture extensions
- Built with modern Chrome Extension APIs
- Community feedback and contributions

---

<div align="center">

**⭐ Star this repository if QuickGestures enhances your browsing experience!**

[Report Bug](../../issues) • [Request Feature](../../issues)

</div>