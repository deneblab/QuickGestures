import { ExtensionSettings, GestureContext, ActionType, GestureMapping, TabOpenPosition, TabOpenState, TabClosePosition } from '../shared/types';
import { DEFAULT_SETTINGS, DEFAULT_GOOGLE_MAPS, ACTION_LABELS } from '../shared/constants';
import { sendMessage } from '../shared/messaging';
import { convertGestureToArrows } from '../shared/utils';

class OptionsPage {
  private settings: ExtensionSettings = structuredClone(DEFAULT_SETTINGS);
  private currentContext: GestureContext = 'page';
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  
  constructor() {
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    await this.loadSettings();
    this.setupEventListeners();
    this.renderUI();
  }
  
  private async loadSettings(): Promise<void> {
    try {
      const response = await sendMessage({
        type: 'settings_request',
        payload: {}
      });
      
      if (response?.success && response.data) {
        this.settings = response.data;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
  
  private async saveSettings(): Promise<void> {
    try {
      const response = await sendMessage({
        type: 'settings_update',
        payload: { settings: this.settings }
      });
      
      if (!response?.success) {
        throw new Error(response?.error ?? 'No response');
      }
      this.showToast('Settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showToast('Could not save settings', true);
    }
  }
  
  private showToast(message: string, isError = false): void {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.toggle('error', isError);
    toast.classList.add('visible');
    
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('visible'), isError ? 4000 : 1500);
  }
  
  // A page dialog instead of confirm(), which blocks the page and cannot be styled
  private confirmAction(message: string, confirmLabel: string): Promise<boolean> {
    const dialog = document.getElementById('confirm-dialog') as HTMLDialogElement;
    const messageElement = document.getElementById('confirm-message') as HTMLParagraphElement;
    const confirmButton = document.getElementById('confirm-ok') as HTMLButtonElement;
    
    messageElement.textContent = message;
    confirmButton.textContent = confirmLabel;
    dialog.returnValue = '';
    dialog.showModal();
    
    return new Promise(resolve => {
      dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
    });
  }
  
  private setupEventListeners(): void {
    this.setupNavigationHandlers();
    this.setupSettingsHandlers();
    this.setupTabOrderHandlers();
    this.setupMappingHandlers();
    this.setupUtilityHandlers();
    this.setupModalHandlers();
  }
  
  private setupNavigationHandlers(): void {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const section = target.dataset.section;
        if (section) {
          this.switchSection(section);
        }
      });
    });
    
    document.querySelectorAll('.context-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const context = target.dataset.context as GestureContext;
        if (context) {
          this.switchContext(context);
        }
      });
    });
  }
  
  private setupSettingsHandlers(): void {
    this.setupExclusionHandlers();
    
    const globalEnabled = document.getElementById('globalEnabled') as HTMLInputElement;
    globalEnabled.addEventListener('change', async () => {
      this.settings.globalEnabled = globalEnabled.checked;
      await this.saveSettings();
    });
    
    const lineColor = document.getElementById('lineColor') as HTMLInputElement;
    lineColor.addEventListener('change', async () => {
      this.settings.style.lineColor = lineColor.value;
      await this.saveSettings();
    });
    
    const lineWidth = document.getElementById('lineWidth') as HTMLInputElement;
    const lineWidthValue = document.getElementById('lineWidthValue') as HTMLSpanElement;
    lineWidth.addEventListener('input', () => {
      lineWidthValue.textContent = lineWidth.value + 'px';
    });
    lineWidth.addEventListener('change', async () => {
      this.settings.style.lineWidth = parseInt(lineWidth.value);
      await this.saveSettings();
    });
    
    const highContrast = document.getElementById('highContrast') as HTMLInputElement;
    highContrast.addEventListener('change', async () => {
      this.settings.style.highContrast = highContrast.checked;
      await this.saveSettings();
    });
    
    const showContextChip = document.getElementById('showContextChip') as HTMLInputElement;
    showContextChip.addEventListener('change', async () => {
      this.settings.style.showContextChip = showContextChip.checked;
      await this.saveSettings();
    });
    
    const showGestureName = document.getElementById('showGestureName') as HTMLInputElement;
    showGestureName.addEventListener('change', async () => {
      this.settings.style.showGestureName = showGestureName.checked;
      await this.saveSettings();
    });
    
    const clickableMapPreview = document.getElementById('clickableMapPreview') as HTMLInputElement;
    clickableMapPreview.addEventListener('change', async () => {
      this.settings.googleMaps.clickableMapPreview = clickableMapPreview.checked;
      await this.saveSettings();
    });
    
    const pageEnabled = document.getElementById('pageEnabled') as HTMLInputElement;
    pageEnabled.addEventListener('change', async () => {
      this.settings.activation.pageEnabled = pageEnabled.checked;
      await this.saveSettings();
    });
    
    const pageThreshold = document.getElementById('pageThreshold') as HTMLInputElement;
    const pageThresholdValue = document.getElementById('pageThresholdValue') as HTMLSpanElement;
    pageThreshold.addEventListener('input', () => {
      pageThresholdValue.textContent = pageThreshold.value + 'px';
    });
    pageThreshold.addEventListener('change', async () => {
      this.settings.activation.pageThresholdPx = parseInt(pageThreshold.value);
      await this.saveSettings();
    });
    
    const linkEnabled = document.getElementById('linkEnabled') as HTMLInputElement;
    linkEnabled.addEventListener('change', async () => {
      this.settings.activation.linkEnabled = linkEnabled.checked;
      await this.saveSettings();
    });
    
    const linkModifier = document.getElementById('linkModifier') as HTMLSelectElement;
    linkModifier.addEventListener('change', async () => {
      this.settings.activation.linkModifier = linkModifier.value as any;
      await this.saveSettings();
    });
    
    const selectionEnabled = document.getElementById('selectionEnabled') as HTMLInputElement;
    selectionEnabled.addEventListener('change', async () => {
      this.settings.activation.selectionEnabled = selectionEnabled.checked;
      await this.saveSettings();
    });
    
    const selectionModifier = document.getElementById('selectionModifier') as HTMLSelectElement;
    selectionModifier.addEventListener('change', async () => {
      this.settings.activation.selectionModifier = selectionModifier.value as any;
      await this.saveSettings();
    });
    
    const searchProvider = document.getElementById('searchProvider') as HTMLSelectElement;
    searchProvider.addEventListener('change', async () => {
      this.settings.search.provider = searchProvider.value as any;
      this.toggleCustomUrlGroup();
      await this.saveSettings();
    });
    
    const customSearchUrl = document.getElementById('customSearchUrl') as HTMLInputElement;
    customSearchUrl.addEventListener('change', async () => {
      this.settings.search.customUrl = customSearchUrl.value;
      await this.saveSettings();
    });
  }
  
  private setupTabOrderHandlers(): void {
    document.querySelectorAll('input[name="tabOpenPosition"]').forEach(radio => {
      radio.addEventListener('change', async (e) => {
        this.settings.tabOrder.openPosition = (e.target as HTMLInputElement).value as TabOpenPosition;
        await this.saveSettings();
      });
    });

    document.querySelectorAll('input[name="tabOpenState"]').forEach(radio => {
      radio.addEventListener('change', async (e) => {
        this.settings.tabOrder.openState = (e.target as HTMLInputElement).value as TabOpenState;
        await this.saveSettings();
      });
    });

    document.querySelectorAll('input[name="tabClosePosition"]').forEach(radio => {
      radio.addEventListener('change', async (e) => {
        this.settings.tabOrder.closePosition = (e.target as HTMLInputElement).value as TabClosePosition;
        await this.saveSettings();
      });
    });
  }

  private setupMappingHandlers(): void {
    const addMappingBtn = document.getElementById('add-mapping-btn');
    addMappingBtn?.addEventListener('click', () => {
      this.showAddMappingModal();
    });
  }
  
  private setupUtilityHandlers(): void {
    const resetBtn = document.getElementById('reset-settings');
    resetBtn?.addEventListener('click', async () => {
      if (await this.confirmAction('Reset all settings, including your gesture mappings and exclusions, to the defaults?', 'Reset')) {
        this.settings = structuredClone(DEFAULT_SETTINGS);
        await this.saveSettings();
        this.renderUI();
      }
    });
    
    const exportBtn = document.getElementById('export-settings');
    exportBtn?.addEventListener('click', () => {
      this.exportSettings();
    });
    
    const importBtn = document.getElementById('import-settings');
    const importFile = document.getElementById('import-file') as HTMLInputElement;
    
    importBtn?.addEventListener('click', () => {
      importFile.click();
    });
    
    importFile.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0];
      if (file) {
        this.importSettings(file);
      }
      // Lets the same file be picked again
      input.value = '';
    });
  }
  
  private setupModalHandlers(): void {
    const modal = document.getElementById('add-mapping-modal') as HTMLDialogElement;
    const form = document.getElementById('add-mapping-form') as HTMLFormElement;
    const cancelBtn = document.getElementById('cancel-mapping');
    const gestureInput = document.getElementById('new-gesture') as HTMLInputElement;
    
    cancelBtn?.addEventListener('click', () => {
      this.hideAddMappingModal();
    });
    
    // Save button and Enter both submit the form; the dialog stays open while the input is invalid
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveNewMapping();
    });
    
    gestureInput.addEventListener('input', () => {
      this.setFieldError(gestureInput, 'new-gesture-error', '');
    });
    
    modal.addEventListener('close', () => {
      this.resetAddMappingForm();
    });
    
    // A click on the backdrop lands on the dialog element itself
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideAddMappingModal();
      }
    });
  }
  
  private setFieldError(input: HTMLInputElement, errorId: string, message: string): void {
    const error = document.getElementById(errorId);
    if (!error) return;
    
    error.textContent = message;
    error.hidden = message === '';
    input.setAttribute('aria-invalid', String(message !== ''));
    if (message) {
      input.focus();
    }
  }
  
  private renderUI(): void {
    this.renderGlobalSettings();
    this.renderStyleSettings();
    this.renderContextSettings();
    this.renderSearchSettings();
    this.renderTabOrderSettings();
    this.renderExclusions();
    this.renderMappings();
    this.populateActionOptions();
    this.renderVersion();
  }
  
  private renderVersion(): void {
    const version = document.getElementById('version');
    if (version) {
      version.textContent = `v${chrome.runtime.getManifest().version}`;
    }
  }
  
  private renderGlobalSettings(): void {
    const globalEnabled = document.getElementById('globalEnabled') as HTMLInputElement;
    globalEnabled.checked = this.settings.globalEnabled;
  }
  
  private renderStyleSettings(): void {
    const lineColor = document.getElementById('lineColor') as HTMLInputElement;
    lineColor.value = this.settings.style.lineColor;
    
    const lineWidth = document.getElementById('lineWidth') as HTMLInputElement;
    const lineWidthValue = document.getElementById('lineWidthValue') as HTMLSpanElement;
    lineWidth.value = this.settings.style.lineWidth.toString();
    lineWidthValue.textContent = this.settings.style.lineWidth + 'px';
    
    const highContrast = document.getElementById('highContrast') as HTMLInputElement;
    highContrast.checked = this.settings.style.highContrast;
    
    const showContextChip = document.getElementById('showContextChip') as HTMLInputElement;
    showContextChip.checked = this.settings.style.showContextChip;
    
    const showGestureName = document.getElementById('showGestureName') as HTMLInputElement;
    showGestureName.checked = this.settings.style.showGestureName;
  }
  
  private renderContextSettings(): void {
    const pageEnabled = document.getElementById('pageEnabled') as HTMLInputElement;
    pageEnabled.checked = this.settings.activation.pageEnabled;
    
    const pageThreshold = document.getElementById('pageThreshold') as HTMLInputElement;
    const pageThresholdValue = document.getElementById('pageThresholdValue') as HTMLSpanElement;
    pageThreshold.value = this.settings.activation.pageThresholdPx.toString();
    pageThresholdValue.textContent = this.settings.activation.pageThresholdPx + 'px';
    
    const linkEnabled = document.getElementById('linkEnabled') as HTMLInputElement;
    linkEnabled.checked = this.settings.activation.linkEnabled;
    
    const linkModifier = document.getElementById('linkModifier') as HTMLSelectElement;
    linkModifier.value = this.settings.activation.linkModifier;
    
    const selectionEnabled = document.getElementById('selectionEnabled') as HTMLInputElement;
    selectionEnabled.checked = this.settings.activation.selectionEnabled;
    
    const selectionModifier = document.getElementById('selectionModifier') as HTMLSelectElement;
    selectionModifier.value = this.settings.activation.selectionModifier;
  }
  
  private renderSearchSettings(): void {
    const searchProvider = document.getElementById('searchProvider') as HTMLSelectElement;
    searchProvider.value = this.settings.search.provider;
    
    const clickableMapPreview = document.getElementById('clickableMapPreview') as HTMLInputElement;
    clickableMapPreview.checked = this.settings.googleMaps.clickableMapPreview;
    
    const customSearchUrl = document.getElementById('customSearchUrl') as HTMLInputElement;
    customSearchUrl.value = this.settings.search.customUrl || '';
    
    this.toggleCustomUrlGroup();
  }
  
  private renderTabOrderSettings(): void {
    const openPosRadio = document.querySelector(`input[name="tabOpenPosition"][value="${this.settings.tabOrder.openPosition}"]`) as HTMLInputElement;
    if (openPosRadio) openPosRadio.checked = true;

    const openStateRadio = document.querySelector(`input[name="tabOpenState"][value="${this.settings.tabOrder.openState}"]`) as HTMLInputElement;
    if (openStateRadio) openStateRadio.checked = true;

    const closePosRadio = document.querySelector(`input[name="tabClosePosition"][value="${this.settings.tabOrder.closePosition}"]`) as HTMLInputElement;
    if (closePosRadio) closePosRadio.checked = true;
  }

  private renderMappings(): void {
    const container = document.getElementById('mappings-container');
    if (!container) return;
    
    const mappings = this.settings.mappings[this.currentContext];
    container.replaceChildren();
    
    if (mappings.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No gestures in this context yet.';
      container.appendChild(empty);
      return;
    }
    
    const table = document.createElement('table');
    table.className = 'mappings-table';
    
    const headerRow = table.createTHead().insertRow();
    ['Gesture', 'Action', ''].forEach(text => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = text;
      headerRow.appendChild(th);
    });
    
    const body = table.createTBody();
    mappings.forEach((mapping, index) => {
      const row = body.insertRow();
      
      const gestureCell = row.insertCell();
      gestureCell.className = 'gesture-cell';
      gestureCell.textContent = convertGestureToArrows(mapping.gesture);
      gestureCell.title = mapping.gesture;
      
      row.insertCell().textContent = ACTION_LABELS[mapping.action] ?? mapping.action;
      
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn-ghost-danger';
      deleteButton.textContent = 'Delete';
      deleteButton.setAttribute('aria-label', `Delete ${ACTION_LABELS[mapping.action] ?? mapping.action} gesture`);
      deleteButton.addEventListener('click', () => this.deleteMapping(index));
      row.insertCell().appendChild(deleteButton);
    });
    
    container.appendChild(table);
  }
  
  private populateActionOptions(): void {
    const actionSelect = document.getElementById('new-action') as HTMLSelectElement;
    if (!actionSelect) return;
    
    actionSelect.innerHTML = '';
    
    Object.entries(ACTION_LABELS).forEach(([action, label]) => {
      const option = document.createElement('option');
      option.value = action;
      option.textContent = label;
      actionSelect.appendChild(option);
    });
  }
  
  private switchSection(section: string): void {
    document.querySelectorAll<HTMLElement>('.nav-item').forEach(item => {
      const isActive = item.dataset.section === section;
      item.classList.toggle('active', isActive);
      if (isActive) {
        item.setAttribute('aria-current', 'page');
        // On narrow screens the menu is a horizontal strip that may have the item out of view
        item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } else {
        item.removeAttribute('aria-current');
      }
    });
    document.querySelectorAll('.section').forEach(sec => {
      sec.classList.toggle('active', sec.id === `${section}-section`);
    });
  }
  
  private switchContext(context: GestureContext): void {
    this.currentContext = context;
    
    document.querySelectorAll<HTMLElement>('.context-tab').forEach(tab => {
      const isActive = tab.dataset.context === context;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
    
    this.renderMappings();
  }
  
  private toggleCustomUrlGroup(): void {
    const customUrlGroup = document.getElementById('customUrlGroup');
    const searchProvider = document.getElementById('searchProvider') as HTMLSelectElement;
    
    if (searchProvider.value === 'custom') {
      customUrlGroup?.classList.add('show');
    } else {
      customUrlGroup?.classList.remove('show');
    }
  }
  
  private showAddMappingModal(): void {
    const modal = document.getElementById('add-mapping-modal') as HTMLDialogElement;
    modal.showModal();
  }
  
  private hideAddMappingModal(): void {
    const modal = document.getElementById('add-mapping-modal') as HTMLDialogElement;
    modal.close();
  }
  
  private resetAddMappingForm(): void {
    const gestureInput = document.getElementById('new-gesture') as HTMLInputElement;
    const actionSelect = document.getElementById('new-action') as HTMLSelectElement;
    gestureInput.value = '';
    actionSelect.selectedIndex = 0;
    this.setFieldError(gestureInput, 'new-gesture-error', '');
  }
  
  private async saveNewMapping(): Promise<void> {
    const gestureInput = document.getElementById('new-gesture') as HTMLInputElement;
    const actionSelect = document.getElementById('new-action') as HTMLSelectElement;
    
    const gesture = gestureInput.value.trim().toUpperCase();
    const action = actionSelect.value as ActionType;
    
    if (!gesture || !action) {
      this.setFieldError(gestureInput, 'new-gesture-error', 'Enter a gesture.');
      return;
    }
    
    if (!/^[LRUD]+$/.test(gesture)) {
      this.setFieldError(gestureInput, 'new-gesture-error', 'Use only the letters L, R, U and D.');
      return;
    }
    
    const existing = this.settings.mappings[this.currentContext].find(m => m.gesture === gesture);
    if (existing) {
      this.setFieldError(gestureInput, 'new-gesture-error',
        `This gesture already runs "${ACTION_LABELS[existing.action]}". Delete that mapping first.`);
      return;
    }
    
    const newMapping: GestureMapping = { gesture, action };
    this.settings.mappings[this.currentContext].push(newMapping);
    
    await this.saveSettings();
    this.renderMappings();
    this.hideAddMappingModal();
  }
  
  private async deleteMapping(index: number): Promise<void> {
    const mapping = this.settings.mappings[this.currentContext][index];
    const label = `${convertGestureToArrows(mapping.gesture)} ${ACTION_LABELS[mapping.action] ?? mapping.action}`;
    
    if (await this.confirmAction(`Delete the gesture ${label}?`, 'Delete')) {
      this.settings.mappings[this.currentContext].splice(index, 1);
      await this.saveSettings();
      this.renderMappings();
    }
  }
  
  private exportSettings(): void {
    const dataStr = JSON.stringify(this.settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'quickgestures-settings.json';
    link.click();
  }
  
  private async importSettings(file: File): Promise<void> {
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      
      if (this.validateSettings(imported)) {
        // Files exported before the Google Maps option existed have no googleMaps section
        this.settings = { ...imported, googleMaps: imported.googleMaps ?? DEFAULT_GOOGLE_MAPS };
        await this.saveSettings();
        this.renderUI();
        this.showToast('Settings imported');
      } else {
        this.showToast('This file is not a QuickGestures settings file', true);
      }
    } catch (error) {
      this.showToast('Could not read the settings file', true);
    }
  }
  
  private validateSettings(settings: any): settings is ExtensionSettings {
    return settings && 
           typeof settings.globalEnabled === 'boolean' &&
           settings.style &&
           settings.activation &&
           settings.mappings &&
           settings.search;
  }
  
  private setupExclusionHandlers(): void {
    const addButton = document.getElementById('addExclusion');
    const input = document.getElementById('exclusionPattern') as HTMLInputElement;
    
    addButton?.addEventListener('click', () => {
      this.addExclusion();
    });
    
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.addExclusion();
      }
    });
    
    input?.addEventListener('input', () => {
      this.setFieldError(input, 'exclusionError', '');
    });
  }
  
  private renderExclusions(): void {
    const list = document.getElementById('exclusionsList');
    if (!list) return;
    
    list.replaceChildren();
    
    this.settings.exclusions.forEach((pattern, index) => {
      const item = document.createElement('li');
      item.className = 'exclusion-item';
      
      const patternElement = document.createElement('span');
      patternElement.className = 'exclusion-pattern';
      patternElement.textContent = pattern;
      
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'btn-ghost-danger';
      removeButton.textContent = 'Remove';
      removeButton.setAttribute('aria-label', `Remove ${pattern}`);
      removeButton.addEventListener('click', () => this.removeExclusion(index));
      
      item.append(patternElement, removeButton);
      list.appendChild(item);
    });
  }
  
  private async addExclusion(): Promise<void> {
    const input = document.getElementById('exclusionPattern') as HTMLInputElement;
    const pattern = input.value.trim();
    
    if (!pattern) {
      this.setFieldError(input, 'exclusionError', 'Enter a pattern.');
      return;
    }
    
    if (this.settings.exclusions.includes(pattern)) {
      this.setFieldError(input, 'exclusionError', 'This pattern is already in the list.');
      return;
    }
    
    this.settings.exclusions.push(pattern);
    input.value = '';
    
    await this.saveSettings();
    this.renderExclusions();
  }
  
  private async removeExclusion(index: number): Promise<void> {
    if (await this.confirmAction(`Remove the exclusion ${this.settings.exclusions[index]}?`, 'Remove')) {
      this.settings.exclusions.splice(index, 1);
      await this.saveSettings();
      this.renderExclusions();
    }
  }
  
}

new OptionsPage();