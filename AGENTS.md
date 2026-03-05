# 🤖 AGENTS.md - Coding Agent Guide

> **Essential information for AI coding agents working on QuickGestures Chrome Extension**

## 🎯 Project Overview

**QuickGestures** is a Chrome extension that enables mouse gesture navigation and control. Users draw patterns with their mouse to trigger actions like navigation, tab management, and text operations.

### Core Technology Stack
- **TypeScript** - Primary language with strict type checking
- **esbuild** - Fast compilation and bundling
- **Chrome Extensions API** - Manifest V3 compliance
- **Node.js 18+** - Development environment
- **Canvas API** - Visual gesture overlay rendering

### Project Structure
```
src/
├── background/          # Service worker (Manifest V3)
│   ├── service-worker.ts    # Main background script
│   ├── action-router.ts     # Gesture action execution
│   ├── storage.ts           # Settings persistence
│   ├── tab-manager.ts       # Tab operations
│   └── tab-order-service.ts # Tab open/close order preferences
├── content/             # Content scripts (injected into pages)
│   ├── content-script.ts    # Main content script entry
│   ├── gesture-capture.ts   # Mouse event capture
│   ├── context-detector.ts  # Detect gesture context
│   ├── overlay.ts           # Visual gesture feedback
│   ├── gesture-recognition.ts # Pattern recognition
│   └── exclusion-matcher.ts # URL exclusion logic
├── options/             # Settings/configuration UI
│   ├── options.html         # Settings page UI
│   ├── options.ts           # Settings logic
│   └── options.css          # Styling
├── shared/              # Common utilities and types
│   ├── types.ts             # TypeScript definitions
│   ├── constants.ts         # Default settings & mappings
│   ├── messaging.ts         # Inter-script communication
│   └── utils.ts             # Helper functions
└── assets/              # Icons and static resources
```

## 🏗️ Architecture & Key Patterns

### Extension Architecture
QuickGestures follows Chrome Extension Manifest V3 patterns:

1. **Background Service Worker** (`background/`) - Handles extension lifecycle, storage, and action routing
2. **Content Scripts** (`content/`) - Injected into web pages, captures gestures and provides feedback  
3. **Options Page** (`options/`) - Standalone settings interface

### Data Flow Pattern
```
User Gesture → Content Script → Background Worker → Chrome API → Result
     ↑              ↓              ↓                 ↓         ↓
  Visual         Pattern        Action            Tab/Search  Feedback
  Feedback       Recognition    Routing           Operations
```

### Core Interfaces (from `src/shared/types.ts`)
```typescript
// Main settings structure
interface ExtensionSettings {
  style: StyleSettings;           // Visual appearance
  activation: ActivationSettings; // When gestures activate
  recognition: RecognitionSettings; // Gesture sensitivity
  mappings: MappingSettings;      // Gesture → Action mapping
  search: SearchSettings;         // Search engine config
  tabOrder: TabOrderSettings;    // Tab open/close behavior
  exclusions: string[];          // URL exclusion patterns
  globalEnabled: boolean;
  version: number;
}

// Gesture contexts
type GestureContext = 'page' | 'link' | 'selection';

// Available actions (sample from actual types)
type ActionType = 
  | 'go_back' | 'go_forward' | 'scroll_top' | 'scroll_bottom'
  | 'new_tab' | 'close_tab' | 'reopen_tab'
  | 'open_link_background' | 'open_link_foreground' | 'open_link_window'
  | 'search_text_new' | 'search_text_current';
```

### Message Passing Pattern
All inter-script communication uses typed messages:
```typescript
// Example: Content → Background
await sendMessage({
  type: 'gesture_recognized',
  payload: {
    context: 'page',
    gesture: 'L',  // Left arrow
    tabId: chrome.tabs.getCurrent().id,
    linkHref?: string,
    selectedText?: string
  }
});
```

## 🛠️ Development Guidelines

### Code Conventions
- **TypeScript**: Strict type checking enabled, all files use `.ts`
- **Naming**: camelCase variables, PascalCase types/interfaces  
- **No Comments**: Code should be self-documenting through clear naming
- **Imports**: Use relative paths, group by external/internal
- **Error Handling**: Always handle Chrome API errors and edge cases

### Build System (esbuild)
```bash
npm run dev        # Watch mode with source maps
npm run build      # Production build  
npm run clean      # Clean build artifacts
```

**Important**: After code changes, reload extension in `chrome://extensions/`

### Debugging Approaches
1. **Background Script**: Chrome Extensions page → "service worker" link
2. **Content Script**: Page DevTools (F12) - scripts appear in Sources
3. **Options Page**: Right-click → Inspect on options page
4. **Console Logging**: Temporary `console.log` statements (remove before commit)

### Testing Strategy
- **No automated tests** - currently manual testing only
- **Manual checklist** provided in `docs/development.md`
- Test across multiple websites and contexts
- Verify exclusion patterns work correctly

## 📋 Common Development Tasks

### Adding New Gesture Actions

1. **Add action type**:
   ```typescript
   // src/shared/types.ts
   export type ActionType = 
     | 'existing_action'
     | 'new_custom_action'; // Add here
   ```

2. **Add action label**:
   ```typescript
   // src/shared/constants.ts
   export const ACTION_LABELS: Record<ActionType, string> = {
     new_custom_action: 'Custom Action Description'
   };
   ```

3. **Implement handler**:
   ```typescript
   // src/background/action-router.ts
   private async handleNewCustomAction(tabId: number): Promise<void> {
     // Implementation using Chrome APIs
   }
   ```

4. **Add to router**:
   ```typescript
   // In ActionRouter.routeAction()
   case 'new_custom_action':
     return this.handleNewCustomAction(tabId);
   ```

### Adding New Gesture Contexts

1. **Update context type**:
   ```typescript
   // src/shared/types.ts
   export type GestureContext = 'page' | 'link' | 'selection' | 'new_context';
   ```

2. **Add detection logic**:
   ```typescript
   // src/content/context-detector.ts
   detectContext(element: Element): ContextDetection {
     // Add logic to identify new context
   }
   ```

3. **Add default mappings**:
   ```typescript
   // src/shared/constants.ts - add new mapping array
   export const DEFAULT_NEW_CONTEXT_MAPPINGS = [
     { gesture: 'R', action: 'some_action' as ActionType }
   ];
   ```

### Modifying Visual Feedback

- **Overlay rendering**: `src/content/overlay.ts`  
- **Style settings**: `src/shared/types.ts` → `StyleSettings`
- **Default styles**: `src/shared/constants.ts` → `DEFAULT_STYLE`

### Working with Settings

- **Read settings**: `await getSettings()` from background
- **Update settings**: `await saveSettings(newSettings)`  
- **Settings sync**: Automatic via Chrome storage API
- **Settings UI**: `src/options/options.ts`

## 🔧 Important Commands & Scripts

```bash
# Development workflow
npm install           # Install dependencies
npm run dev          # Start development with watch
npm run build        # Production build

# Release workflow  
npm run prepare-release    # Build + package + changelog
npm run release           # Full release preparation

# Utility commands
npm run clean        # Remove dist/ directory
npm run version:sync # Sync versions across files
npm run package      # Create extension ZIP
```

## ⚠️ Critical Constraints & Limitations

### Chrome Extension Security
- **Content Security Policy**: No inline scripts or eval()
- **Permissions**: Only request minimal required permissions
- **Cross-origin**: Limited by CORS, same-origin policies
- **Manifest V3**: Service worker limitations (no DOM access)

### Required Permissions (from manifest.json)
- `storage` - Save settings locally
- `tabs` - Tab management operations and tab order control
- `scripting` - Inject content scripts and interact with pages
- `activeTab` - Access current tab for gesture capture
- `contextMenus` - Right-click menu integration
- `sessions` - Restore recently closed tabs
- `downloads` - Handle link downloads
- `host_permissions` - Access to http/https sites for gesture capture

### API Restrictions
- **Background scripts**: Cannot access DOM directly
- **Content scripts**: Cannot use all Chrome APIs
- **Message passing**: Required for cross-context communication
- **Storage quotas**: Chrome storage has size limits

### Development Constraints  
- **No build tools** in content scripts (esbuild creates single files)
- **TypeScript compilation** required for all changes
- **Extension reload** needed after most changes
- **Manual testing** required (no automated test framework)

### URL Exclusions
- **Wildcard patterns**: `*.example.com/*` format
- **Real-time matching**: Works without page reload
- **Context-sensitive**: Can exclude specific gesture contexts

## 🔍 Issue & Session Management

### Issue Tracking System
- **Location**: `.agents/issues/` in project root
- **Structure**: `{IssueId}/plan.md` and `{IssueId}/state.json`
- **Session continuity**: Resumes across sessions automatically
- **Progress tracking**: File creation and modification tracking

### Commit Patterns
```bash
# Follow conventional commits
feat: add new gesture pattern for window management
fix: resolve context detection on dynamic content  
docs: update development guide with new patterns
refactor: simplify message passing between scripts
```

### Release Workflow
- **Production branch**: For stable releases
- **GitHub Actions**: Automated release creation
- **Version sync**: Automatic across manifest.json, package.json, version.txt

## 🚀 Success Metrics for Agents

### Code Quality
- [ ] TypeScript compiles without errors or warnings
- [ ] All Chrome Extension APIs used correctly
- [ ] Message passing follows established patterns
- [ ] Error handling for all async operations

### Functionality  
- [ ] Extension loads and activates in Chrome
- [ ] Gestures work across different websites
- [ ] Settings persist and sync correctly
- [ ] Visual feedback displays properly

### Integration
- [ ] Follows existing code conventions
- [ ] Uses established utility functions
- [ ] Integrates with existing build system
- [ ] Documentation updated if needed

---

## 📚 Quick Reference Links

- **Chrome Extension API**: https://developer.chrome.com/docs/extensions/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Project Documentation**: `docs/` directory
- **Development Guide**: `docs/development.md`
- **Architecture Overview**: See `docs/development.md` → "Architecture Overview"

---

*This document should be the first reference for any coding agent working on QuickGestures. Keep it updated as the project evolves.*