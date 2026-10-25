---
title: Installation
description: Install QuickGestures from the Chrome Web Store or build it from source.
---

# Installation

{% if site.chrome_web_store_url != "" %}
## From the Chrome Web Store

The easiest way: open [QuickGestures in the Chrome Web Store]({{ site.chrome_web_store_url }}) and click **Add to Chrome**. Chrome keeps the extension up to date for you.
{% else %}
## From the Chrome Web Store

QuickGestures is available in the Chrome Web Store. Search for **QuickGestures** there and click **Add to Chrome**. Chrome keeps the extension up to date for you.
{% endif %}

After installing, the options page opens so you can look at the gestures. Then try one on any web page: hold the right mouse button, move the mouse to the left and let go to go back.

> On macOS and Linux the right-click menu opens as soon as the button is pressed, so QuickGestures holds it back while you draw. Right-click twice in quick succession to open the menu.

## From a release package

Every version is also published on the [Releases page]({{ site.repository_url }}/releases) as a zip file.

1. Download `quickgestures-v<version>.zip` from the latest release and unzip it into a folder you will keep.
2. Open `chrome://extensions/` in Chrome.
3. Turn on **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the unzipped folder.

Extensions loaded this way are not updated automatically: repeat the steps with a newer release to update.

## From source

You need Google Chrome and [Node.js](https://nodejs.org/) 24 or newer.

```bash
git clone https://github.com/deneblab/QuickGestures.git
cd QuickGestures
npm install
npm run build
```

This creates the `dist` folder. Load it in Chrome with **Load unpacked**, as described above.

To also create the release zip (`output/quickgestures-v<version>.zip`), run the full build instead: `.\build.cmd` on Windows or `./build.sh` on Linux and macOS. It needs the .NET 10 SDK and installs a local copy if it is missing.

While you work on the code, `npm run dev` rebuilds on every change; reload the extension on `chrome://extensions/` to pick up the new build.

## Troubleshooting

### Gestures do nothing

- Check that QuickGestures is turned on in `chrome://extensions/` and that **Extension enabled** is on at the top of its options page.
- Gestures do not work on Chrome's own pages, such as the new tab page, `chrome://` pages and the Chrome Web Store. Try a regular website.
- Check that the site is not listed under **Exclusions** on the options page.
- Pages that were open before you installed or updated the extension need a reload.

### Gestures start too easily, or not at all

Change **Movement threshold** under **Contexts** on the options page: a higher value needs a longer movement before a gesture starts.

### Dragging links or text no longer works as before

Link and selection gestures use the left mouse button. Under **Contexts**, choose an activation key (Alt, Ctrl or Shift) so they start only while that key is held, or turn them off.

## Uninstalling

Open `chrome://extensions/`, find QuickGestures and click **Remove**. Its settings are removed from Chrome together with it.
