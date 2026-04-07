import { TabOrderSettings } from '../shared/types';
import { DEFAULT_TAB_ORDER, STORAGE_KEYS } from '../shared/constants';

export class TabOrderService {
  private settings: TabOrderSettings = DEFAULT_TAB_ORDER;
  private activationStacks: Map<number, number[]> = new Map();
  private tabIndexMap: Map<number, number> = new Map();

  constructor() {
    this.loadSettings();
    this.initializeTabIndices();
    this.setupListeners();
  }

  private async initializeTabIndices(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id !== undefined) {
          this.tabIndexMap.set(tab.id, tab.index);
        }
      }
    } catch (error) {
      console.error('TabOrderService: Failed to initialize tab indices:', error);
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get([STORAGE_KEYS.SETTINGS]);
      const stored = result[STORAGE_KEYS.SETTINGS];
      if (stored?.tabOrder) {
        this.settings = stored.tabOrder;
      }
    } catch (error) {
      console.error('TabOrderService: Failed to load settings:', error);
    }
  }

  private setupListeners(): void {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes[STORAGE_KEYS.SETTINGS]) {
        const newSettings = changes[STORAGE_KEYS.SETTINGS].newValue;
        if (newSettings?.tabOrder) {
          this.settings = newSettings.tabOrder;
        }
      }
    });

    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.trackActivation(activeInfo.windowId, activeInfo.tabId);
    });

    chrome.tabs.onCreated.addListener((tab) => {
      if (tab.id !== undefined) {
        this.tabIndexMap.set(tab.id, tab.index);
      }
      this.handleTabCreated(tab);
    });

    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
      this.handleTabRemoved(tabId, removeInfo);
    });

    chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
      this.tabIndexMap.set(tabId, moveInfo.toIndex);
    });

    chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
      this.tabIndexMap.set(tabId, attachInfo.newPosition);
    });

    chrome.tabs.onDetached.addListener((tabId) => {
      this.tabIndexMap.delete(tabId);
    });

    chrome.windows.onRemoved.addListener((windowId) => {
      this.activationStacks.delete(windowId);
    });
  }

  private trackActivation(windowId: number, tabId: number): void {
    let stack = this.activationStacks.get(windowId);
    if (!stack) {
      stack = [];
      this.activationStacks.set(windowId, stack);
    }

    const existingIndex = stack.indexOf(tabId);
    if (existingIndex !== -1) {
      stack.splice(existingIndex, 1);
    }

    stack.push(tabId);

    if (stack.length > 50) {
      stack.shift();
    }
  }

  private async handleTabCreated(tab: chrome.tabs.Tab): Promise<void> {
    if (tab.id === undefined || tab.windowId === undefined) return;

    try {
      if (this.settings.openPosition !== 'default') {
        await this.applyOpenPosition(tab);
      }

      if (this.settings.openState !== 'default') {
        await this.applyOpenState(tab);
      }
    } catch (error) {
      console.error('TabOrderService: Error handling tab created:', error);
    }
  }

  private async applyOpenPosition(tab: chrome.tabs.Tab): Promise<void> {
    if (tab.id === undefined) return;

    const tabs = await chrome.tabs.query({ windowId: tab.windowId });
    const activeTab = tabs.find(t => t.active && t.id !== tab.id);

    if (!activeTab) return;

    let targetIndex: number;

    switch (this.settings.openPosition) {
      case 'right':
        targetIndex = activeTab.index + 1;
        break;
      case 'left':
        targetIndex = activeTab.index;
        break;
      case 'far_right':
        targetIndex = -1;
        break;
      default:
        return;
    }

    if (tab.index !== targetIndex) {
      await chrome.tabs.move(tab.id, { index: targetIndex });
    }
  }

  private async applyOpenState(tab: chrome.tabs.Tab): Promise<void> {
    if (tab.id === undefined) return;

    switch (this.settings.openState) {
      case 'foreground':
        if (!tab.active) {
          await chrome.tabs.update(tab.id, { active: true });
        }
        break;
      case 'background':
        if (tab.active) {
          await chrome.tabs.update(tab.id, { active: false });
        }
        break;
    }
  }

  private async handleTabRemoved(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo): Promise<void> {
    if (removeInfo.isWindowClosing) {
      this.tabIndexMap.delete(tabId);
      return;
    }

    const closedTabIndex = this.tabIndexMap.get(tabId);
    this.tabIndexMap.delete(tabId);

    const stack = this.activationStacks.get(removeInfo.windowId);
    if (stack) {
      const index = stack.indexOf(tabId);
      if (index !== -1) {
        stack.splice(index, 1);
      }
    }

    if (this.settings.closePosition === 'default') return;

    try {
      const tabs = await chrome.tabs.query({ windowId: removeInfo.windowId });
      if (tabs.length === 0) return;

      tabs.sort((a, b) => a.index - b.index);

      // Update tabIndexMap with current indices after removal
      for (const tab of tabs) {
        if (tab.id !== undefined) {
          this.tabIndexMap.set(tab.id, tab.index);
        }
      }

      let targetTab: chrome.tabs.Tab | undefined;

      switch (this.settings.closePosition) {
        case 'left':
          targetTab = this.findAdjacentTab(tabs, 'left', closedTabIndex);
          break;
        case 'right':
          targetTab = this.findAdjacentTab(tabs, 'right', closedTabIndex);
          break;
        case 'last_active':
          targetTab = this.findLastActiveTab(tabs, removeInfo.windowId);
          break;
      }

      if (targetTab?.id) {
        await chrome.tabs.update(targetTab.id, { active: true });
      }
    } catch (error) {
      console.error('TabOrderService: Error handling tab removed:', error);
    }
  }

  private findAdjacentTab(tabs: chrome.tabs.Tab[], direction: 'left' | 'right', closedTabIndex?: number): chrome.tabs.Tab | undefined {
    if (closedTabIndex === undefined) {
      // Fallback: if we don't know where the closed tab was, use first tab
      return tabs[0];
    }

    if (direction === 'left') {
      // Activate the tab that is now at closedTabIndex - 1 (the original left neighbor)
      const targetIndex = closedTabIndex - 1;
      return tabs.find(t => t.index === targetIndex) || tabs[0];
    } else {
      // Activate the tab that is now at closedTabIndex (the original right neighbor shifted left)
      const targetIndex = closedTabIndex;
      return tabs.find(t => t.index === targetIndex) || tabs[tabs.length - 1];
    }
  }

  private findLastActiveTab(tabs: chrome.tabs.Tab[], windowId: number): chrome.tabs.Tab | undefined {
    const stack = this.activationStacks.get(windowId);
    if (!stack || stack.length === 0) return tabs[0];

    const tabIds = new Set(tabs.map(t => t.id));

    for (let i = stack.length - 1; i >= 0; i--) {
      if (tabIds.has(stack[i])) {
        return tabs.find(t => t.id === stack[i]);
      }
    }

    return tabs[0];
  }
}
