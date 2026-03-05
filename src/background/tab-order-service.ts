import { TabOrderSettings } from '../shared/types';
import { DEFAULT_TAB_ORDER, STORAGE_KEYS } from '../shared/constants';

export class TabOrderService {
  private settings: TabOrderSettings = DEFAULT_TAB_ORDER;
  private activationStacks: Map<number, number[]> = new Map();

  constructor() {
    this.loadSettings();
    this.setupListeners();
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
      this.handleTabCreated(tab);
    });

    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
      this.handleTabRemoved(tabId, removeInfo);
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
      return;
    }

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

      let targetTab: chrome.tabs.Tab | undefined;

      switch (this.settings.closePosition) {
        case 'left':
          targetTab = this.findAdjacentTab(tabs, 'left');
          break;
        case 'right':
          targetTab = this.findAdjacentTab(tabs, 'right');
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

  private findAdjacentTab(tabs: chrome.tabs.Tab[], direction: 'left' | 'right'): chrome.tabs.Tab | undefined {
    const activeTab = tabs.find(t => t.active);
    if (!activeTab) return tabs[0];

    const currentIndex = tabs.indexOf(activeTab);

    if (direction === 'left') {
      return tabs[currentIndex - 1] || tabs[0];
    } else {
      return tabs[currentIndex + 1] || tabs[tabs.length - 1];
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
