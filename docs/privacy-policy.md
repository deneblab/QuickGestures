# Privacy Policy - QuickGestures Chrome Extension

## Overview

QuickGestures ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how our Chrome extension handles your information.

## Data Collection Statement

**QuickGestures does NOT collect any user data.**

### Complete Data Collection Disclosure
We do not collect, store, transmit, or process any of the following data types:

- **Personally identifiable information** (name, address, email address, age, identification numbers)
- **Health information** (heart rate data, medical history, symptoms, diagnoses, procedures)
- **Financial and payment information** (transactions, credit card numbers, financial statements)
- **Authentication information** (passwords, credentials, security questions, PINs)
- **Personal communications** (emails, texts, chat messages)
- **Location data** (region, IP address, GPS coordinates, nearby device information)
- **Web history** (visited pages, page titles, visit timestamps)
- **User activity** (network monitoring, clicks, mouse position, scroll patterns, keystroke logging)
- **Website content** (text, images, sounds, videos, hyperlinks)

### What We DO Store
- **Extension Settings**: Your gesture configurations, visual preferences, tab order preferences, and site exclusions
- **Custom Gestures**: Your personalized gesture mappings and action assignments

**Important**: Your settings are saved with Chrome's storage API (`chrome.storage.sync`). If you are signed in to Chrome with sync enabled, Chrome itself may sync these settings between your devices through your Google account, under Google's privacy policy and your Chrome Sync settings. The extension never sends this data to us or to any other server, and we have no access to it.

## Permissions Explained

### Required Permissions and Their Purpose

#### `storage`
- **Purpose**: Save your extension settings in your browser
- **Data Stored**: Gesture configurations, visual preferences, excluded sites
- **Location**: Chrome's extension storage (`chrome.storage.sync`). Chrome may sync it across your signed-in devices; we never receive it

#### `tabs`
- **Purpose**: Perform tab management actions (close, navigate, create new tabs) and enforce tab order preferences
- **Usage**: When you perform gesture actions like "close tab" or "new tab", and to apply your tab positioning and focus preferences
- **Access**: Current tab information only when a gesture is performed or tab events occur. The extension reads a tab's URL only to detect restricted browser pages (such as `chrome://`) where gestures cannot run; URLs and titles are never stored or transmitted

#### `scripting`
- **Purpose**: Execute gesture recognition on web pages and perform scroll actions
- **Usage**: Inject gesture capture code and handle scroll-to-top/bottom commands
- **Scope**: Only on pages where gestures are enabled

#### `sessions`
- **Purpose**: Restore recently closed tabs when using "reopen tab" gesture
- **Usage**: Only when you perform the reopen closed tab gesture
- **Access**: Recently closed session information only

#### `host_permissions` (http://*/* and https://*/*)
- **Purpose**: Enable gesture recognition on all websites
- **Usage**: Inject gesture capture script to detect mouse movements
- **Access**: Only for gesture detection, no content reading or modification

## Data Security

- **Browser Storage Only**: Settings are kept in Chrome's extension storage and, if you use Chrome Sync, synced by Chrome itself between your own devices
- **No Data Transmission**: The extension itself never sends data to any server
- **Chrome Security**: Uses Chrome's built-in security features for data protection
- **No Third Parties**: No data is shared with third-party services

## Third-Party Services

QuickGestures does not use any third-party services, analytics, or tracking tools.

## User Control

You have complete control over the extension:
- **Settings Management**: Modify or reset all configurations through the options page
- **Site Exclusions**: Disable the extension on specific websites
- **Complete Removal**: Uninstalling the extension removes its stored settings

## Updates to This Policy

We may update this Privacy Policy occasionally. Changes will be reflected in the extension's documentation and Chrome Web Store listing.

## Open Source Transparency

QuickGestures is open source software. You can review the complete source code to verify these privacy practices:
- **Repository**: https://github.com/DenebLab/QuickGestures
- **License**: MIT License
- **Code Review**: All functionality is transparent and auditable

## ❓ Frequently Asked Questions

**Q: Can you see what I'm typing or reading?**  
A: No. QuickGestures only detects mouse movement patterns, not keyboard input or page content.

**Q: Do you track which websites I visit?**  
A: No. We don't store, track, or transmit any browsing data.

**Q: Can I use gestures without internet?**  
A: Yes! All gesture processing happens locally - no internet connection needed.

**Q: How can I verify you're not collecting data?**  
A: QuickGestures is open source. You can review the complete source code on GitHub.

**Q: Can I disable gestures on specific sites?**  
A: Yes! Use the site exclusions feature in settings to disable gestures on any website.

**Q: What happens to my data if I uninstall the extension?**  
A: The extension's stored settings are removed when you uninstall the extension.

## Contact Information

For privacy-related questions or concerns:
- **GitHub Issues**: https://github.com/DenebLab/QuickGestures/issues

## Developer Program Policy Compliance

**Data Usage Certifications:**
- ✅ We do not sell or transfer user data to third parties, outside of approved use cases
- ✅ We do not use or transfer user data for purposes unrelated to our extension's single purpose
- ✅ We do not use or transfer user data to determine creditworthiness or for lending purposes

**Remote Code Declaration:**
- ✅ QuickGestures does not use remote code execution
- ✅ All JavaScript code is included in the extension package
- ✅ No external file references, modules, or eval() string execution

This extension complies with:
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR) principles  
- California Consumer Privacy Act (CCPA) requirements

---

**Key Privacy Principles:**
✅ **No Data Collection** - We don't collect personal information  
✅ **Browser Storage Only** - Settings live in Chrome's storage (synced by Chrome if you use Chrome Sync)  
✅ **No External Communication** - Extension never contacts servers  
✅ **Open Source** - Code is transparent and auditable  
✅ **User Control** - You control all settings and data