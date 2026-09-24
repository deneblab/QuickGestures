# Chrome Web Store: Privacy practices tab

Text to paste into the Developer Dashboard (Store listing → Privacy practices).
Each justification is under the 1000-character field limit.

## Single purpose

QuickGestures lets users control the browser with mouse gestures: the user draws a pattern with the mouse to navigate (back, forward, reload, scroll), manage tabs (new, close, reopen, switch), open or copy links, and search selected text.

## Permission justifications

### `storage`

Saves the user's settings: gesture mappings, trail appearance, tab order preferences, search engine and excluded sites. Settings are kept with `chrome.storage.sync`, so they follow the user's signed-in Chrome profile. They are never sent to the developer or any third party.

### `tabs`

Used for the tab gestures: opening, closing, duplicating, reloading, moving and switching tabs, and applying the user's tab order preferences (where new tabs open and which tab gets focus after closing one). The extension also reads a tab's URL only to detect restricted browser pages (`chrome://`, `chrome-extension://`), where gestures cannot run. URLs and titles are not stored, logged or transmitted.

### `scripting`

Used to run small fixed functions in the active tab after a gesture: history back/forward, scroll to top/bottom and copying a link or selected text. No code is loaded from outside the extension, and the functions are bundled in the package.

### `sessions`

Used only by the "reopen closed tab" gesture, which calls `chrome.sessions.getRecentlyClosed` and `chrome.sessions.restore` to bring back the most recently closed tab or window. The list of closed sessions is not stored or transmitted.

### Host permissions (`http://*/*`, `https://*/*`)

Mouse gestures have to work on any web page the user visits, so the content script that detects the gesture and draws the trail overlay must run on all http and https pages. The script listens to mouse events only to recognize gestures. It does not read, store or transmit page content, form data or browsing history. Users can turn the extension off per site in the Exclusions settings.

## Remote code

**No, I am not using remote code.** All JavaScript is bundled in the extension package. There is no `eval`, no `new Function` and no script loaded from a remote server.

## Data usage

Select **none** of the data-collection categories. QuickGestures does not collect or transmit any user data.

Certifications to tick:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

## Privacy policy URL

Must be a public URL. `docs/privacy-policy.md` is not published yet. See the note below.

## Note: policy wording vs `chrome.storage.sync`

The code uses `chrome.storage.sync` (`src/background/storage.ts`), which Chrome syncs through the user's Google account when sync is on. `docs/privacy-policy.md` describes this, so the policy, the `storage` justification and the README agree. Keep them in sync if the storage area changes.
