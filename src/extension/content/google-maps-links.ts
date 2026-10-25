import { ExtensionSettings } from '../shared/types';

const GOOGLE_HOST_PATTERN = /^(www\.)?google\.(com?\.)?[a-z]{2,3}$/;
const MAPS_SEARCH_URL = 'https://www.google.com/maps/search/?api=1&query=';
const MARKER_ATTRIBUTE = 'data-qg-maps';
const BUTTON_ATTRIBUTE = 'data-qg-maps-button';
const POSITIONED_ATTRIBUTE = 'data-qg-maps-positioned';
const SCAN_DEBOUNCE_MS = 200;

// Google expands the map in place on press/release, before the click arrives
const PRESS_EVENTS = ['pointerdown', 'mousedown', 'pointerup', 'mouseup'] as const;
const CLICK_EVENTS = ['click', 'auxclick'] as const;

// Every Google map carries an attribution such as "Map data ©2026 Google" / "Dane mapy ©2026 Google"
const MAP_ATTRIBUTION_PATTERN = /©\s*\d{4}\s*Google/;
const MAP_ATTRIBUTION_XPATH = '//text()[contains(., "©") and contains(., "Google")]';
const MAX_ATTRIBUTION_DEPTH = 8;
const MIN_MAP_SIZE_PX = 120;
const MAX_MAP_SIZE_PX = 900;

// Older layouts: map previews in local results and the place panel are static map images
const MAP_IMAGE_SELECTORS = [
  'img#lu_map',
  'img[id^="lu_map"]',
  'img[src*="/maps/vt"]',
  'img[data-src*="/maps/vt"]',
  'img[src*="staticmap"]',
  'img[data-src*="staticmap"]'
];

const PLACE_PANEL_SELECTOR = '#rhs';
const PLACE_TITLE_SELECTOR = '[data-attrid="title"]';
const PLACE_ADDRESS_SELECTOR = '[data-attrid="kc:/location/location:address"]';

const PIN_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">'
  + '<path fill="#EA4335" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>'
  + '</svg>';

// Since the EU DMA changes, the map preview on Google Search no longer links to Google Maps
export class GoogleMapsLinks {
  private enabled: boolean;
  private observer: MutationObserver | null = null;
  private scanTimeout: number | null = null;
  private readonly handleClick = this.onClick.bind(this);
  private readonly handlePress = this.onPress.bind(this);

  constructor(settings: ExtensionSettings) {
    this.enabled = this.isEnabled(settings);
    if (this.enabled) {
      this.start();
    }
  }

  static isGoogleHost(): boolean {
    return GOOGLE_HOST_PATTERN.test(window.location.hostname);
  }

  updateSettings(settings: ExtensionSettings): void {
    const enabled = this.isEnabled(settings);
    if (enabled === this.enabled) {
      return;
    }

    this.enabled = enabled;
    if (enabled) {
      this.start();
    } else {
      this.stop();
    }
  }

  destroy(): void {
    this.stop();
  }

  private isEnabled(settings: ExtensionSettings): boolean {
    return settings.globalEnabled && (settings.googleMaps?.clickableMapPreview ?? true);
  }

  // Listening on window in the capture phase runs before Google's own handlers on the page
  private start(): void {
    PRESS_EVENTS.forEach(type => window.addEventListener(type, this.handlePress, true));
    CLICK_EVENTS.forEach(type => window.addEventListener(type, this.handleClick, true));

    this.observer = new MutationObserver(() => this.scheduleScan());
    this.observer.observe(document.documentElement, { childList: true, subtree: true });
    this.scan();
  }

  private stop(): void {
    PRESS_EVENTS.forEach(type => window.removeEventListener(type, this.handlePress, true));
    CLICK_EVENTS.forEach(type => window.removeEventListener(type, this.handleClick, true));

    this.observer?.disconnect();
    this.observer = null;

    if (this.scanTimeout !== null) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }

    document.querySelectorAll(`[${BUTTON_ATTRIBUTE}]`).forEach(button => button.remove());
    document.querySelectorAll<HTMLElement>(`[${MARKER_ATTRIBUTE}]`).forEach(element => {
      element.removeAttribute(MARKER_ATTRIBUTE);
      element.style.cursor = '';
      if (element.hasAttribute(POSITIONED_ATTRIBUTE)) {
        element.removeAttribute(POSITIONED_ATTRIBUTE);
        element.style.position = '';
      }
    });
  }

  private scheduleScan(): void {
    if (this.scanTimeout !== null) {
      return;
    }

    this.scanTimeout = window.setTimeout(() => {
      this.scanTimeout = null;
      this.scan();
    }, SCAN_DEBOUNCE_MS);
  }

  private scan(): void {
    // Google switches between searches without a full reload, so the path is checked on every scan
    if (window.location.pathname !== '/search') {
      return;
    }

    // Pausing the observer keeps our own DOM changes from scheduling another scan
    this.observer?.disconnect();
    try {
      this.findMapContainers().forEach(container => this.markMap(container));
    } finally {
      this.observer?.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  private findMapContainers(): Set<HTMLElement> {
    const containers = new Set<HTMLElement>();

    const attributions = document.evaluate(
      MAP_ATTRIBUTION_XPATH, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
    );
    for (let i = 0; i < attributions.snapshotLength; i++) {
      const textNode = attributions.snapshotItem(i);
      if (!textNode?.textContent || !MAP_ATTRIBUTION_PATTERN.test(textNode.textContent)) {
        continue;
      }
      const container = this.findMapContainer(textNode.parentElement);
      if (container) {
        containers.add(container);
      }
    }

    document.querySelectorAll<HTMLImageElement>(MAP_IMAGE_SELECTORS.join(',')).forEach(image => {
      if (image.parentElement) {
        containers.add(image.parentElement);
      }
    });

    return containers;
  }

  // The map card is the closest ancestor of the attribution that is map-sized
  private findMapContainer(start: HTMLElement | null): HTMLElement | null {
    let element = start;
    for (let depth = 0; element && depth < MAX_ATTRIBUTION_DEPTH; depth++) {
      const rect = element.getBoundingClientRect();
      if (rect.width >= MIN_MAP_SIZE_PX && rect.height >= MIN_MAP_SIZE_PX) {
        return rect.width <= MAX_MAP_SIZE_PX && rect.height <= MAX_MAP_SIZE_PX ? element : null;
      }
      element = element.parentElement;
    }
    return null;
  }

  private markMap(container: HTMLElement): void {
    if (container.closest(`[${MARKER_ATTRIBUTE}]`) || this.hasMapsLink(container)) {
      this.updateButtonLink(container);
      return;
    }

    container.setAttribute(MARKER_ATTRIBUTE, '');
    container.style.cursor = 'pointer';

    // The button is positioned against the map container
    if (['', 'static'].includes(getComputedStyle(container).position)) {
      container.style.position = 'relative';
      container.setAttribute(POSITIONED_ATTRIBUTE, '');
    }

    container.appendChild(this.createButton(container));
  }

  private createButton(container: HTMLElement): HTMLAnchorElement {
    const button = document.createElement('a');
    button.setAttribute(BUTTON_ATTRIBUTE, '');
    button.href = this.getMapsUrl(container);
    button.target = '_blank';
    button.rel = 'noopener';
    button.title = this.getButtonLabel();
    button.setAttribute('aria-label', button.title);
    button.innerHTML = PIN_ICON;
    Object.assign(button.style, {
      position: 'absolute',
      top: '8px',
      left: '8px',
      zIndex: '10',
      width: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
      cursor: 'pointer'
    });
    return button;
  }

  // The query can change without a reload, so existing buttons get a fresh link on every scan
  private updateButtonLink(container: HTMLElement): void {
    const marked = container.closest<HTMLElement>(`[${MARKER_ATTRIBUTE}]`);
    const button = marked?.querySelector<HTMLAnchorElement>(`[${BUTTON_ATTRIBUTE}]`);
    if (marked && button) {
      button.href = this.getMapsUrl(marked);
    }
  }

  private getButtonLabel(): string {
    return document.documentElement.lang.startsWith('pl') ? 'Otwórz w Mapach Google' : 'Open in Google Maps';
  }

  private hasMapsLink(element: Element): boolean {
    const link = element.closest('a[href]') as HTMLAnchorElement | null;
    return !!link && link.href.includes('/maps');
  }

  private onPress(event: MouseEvent): void {
    if (this.getClickedMap(event)) {
      event.stopImmediatePropagation();
    }
  }

  private onClick(event: MouseEvent): void {
    const mapElement = this.getClickedMap(event);
    if (!mapElement) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    const url = this.getMapsUrl(mapElement);
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }

  private getClickedMap(event: MouseEvent): HTMLElement | null {
    // Left and middle button only; the right button belongs to gestures
    if (event.button !== 0 && event.button !== 1) {
      return null;
    }

    const target = event.target as Element | null;

    // Links other than ours (e.g. the map's "Terms") keep working
    const link = target?.closest?.('a[href]');
    if (link && !link.hasAttribute(BUTTON_ATTRIBUTE)) {
      return null;
    }

    return target?.closest?.<HTMLElement>(`[${MARKER_ATTRIBUTE}]`) ?? this.getMapAtPoint(event.clientX, event.clientY);
  }

  // Google may put a clickable layer over the map that is not inside the map container
  private getMapAtPoint(x: number, y: number): HTMLElement | null {
    const maps = document.querySelectorAll<HTMLElement>(`[${MARKER_ATTRIBUTE}]`);
    for (const map of maps) {
      const rect = map.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return map;
      }
    }
    return null;
  }

  private getMapsUrl(mapElement: Element): string {
    const query = this.getQuery(mapElement);
    return query ? MAPS_SEARCH_URL + encodeURIComponent(query) : '';
  }

  private getQuery(mapElement: Element): string {
    const place = this.getPlaceFromPanel(mapElement);
    if (place) {
      return place;
    }

    return new URLSearchParams(window.location.search).get('q')?.trim() ?? '';
  }

  // A single place (knowledge panel) has a title and an address next to its map
  private getPlaceFromPanel(mapElement: Element): string {
    const panel = mapElement.closest(PLACE_PANEL_SELECTOR);
    const address = panel?.querySelector(PLACE_ADDRESS_SELECTOR);
    if (!panel || !address) {
      return '';
    }

    const titleText = panel.querySelector(PLACE_TITLE_SELECTOR)?.textContent?.trim() ?? '';
    return [titleText, this.getAddressText(address)].filter(Boolean).join(', ');
  }

  private getAddressText(address: Element): string {
    // The address row starts with a label such as "Adres:" / "Address:"
    const text = address.textContent?.trim() ?? '';
    const separator = text.indexOf(':');
    return separator >= 0 ? text.slice(separator + 1).trim() : text;
  }
}
