# Changelog

All notable user-facing changes to QuickGestures are documented here.

## [Unreleased]

### Added
- Clickable map on Google Search: in the EU, clicking the map preview in Google results, or the pin button in its corner, opens Google Maps in a new tab again (can be turned off in Search Engine settings)

### Fixed
- The "reopen closed tab" gesture restores the last closed tab again
- Sites added to the exclusion list are now excluded as soon as the page loads, not only after settings are changed
- Excluding a site in settings now stops gestures on open pages right away
- Searching selected text with the "Custom" search provider and no URL set falls back to Google instead of failing
- Right-click page gestures now work on macOS and Linux, where the context menu used to open as soon as the button was pressed; to open the context menu there, right-click twice in quick succession
- The "Search Text in Current Tab" gesture opens the search in the current tab instead of a new one

### Changed
- Removed the unused `activeTab` permission; the extension now requests fewer permissions

## [0.3.7]

### Fixed
- Closing a tab now activates the correct neighbouring tab when "go to left/right" is selected

## [0.3.4]

### Added
- Tab order control: configure where new tabs open (right of current, left of current, or far right)
- Tab open state: choose whether new tabs open in foreground or background
- Tab close behavior: select which tab to focus after closing (left, right, or last active tab)
- New "Tab Order" section in the options page

## [0.3.0]

### Added
- Multi-context mouse gestures (page, link, selection)
- Page navigation gestures: back, forward, scroll up/down
- Tab management gestures: new tab, close tab, reopen closed tab, switch tabs
- Link gestures: open in background or foreground tab, open in new window
- Selection gestures: search selected text in a new or the current tab
- Customizable gesture trail with color and width settings
- Live gesture name display during drawing
- High contrast mode for accessibility
- Configurable search engine (Google, Bing, DuckDuckGo, custom URL)
- Site exclusion patterns with wildcard support
- Full gesture mapping editor with visual arrow symbols; extra actions such as reload, duplicate tab, copy link and copy selection can be assigned to any gesture
- Import/export settings
- Per-context activation settings, with optional modifier keys for link and selection gestures
