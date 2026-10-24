import { ExtensionSettings } from '../shared/types';

const GOOGLE_HOST_PATTERN = /^(www\.)?google\.(com?\.)?[a-z]{2,3}$/;
const MAPS_SEARCH_URL = 'https://www.google.com/maps/search/?api=1&query=';
const MARKER_ATTRIBUTE = 'data-qg-maps';
const SCAN_DEBOUNCE_MS = 200;

// Map previews in local results and the place panel are static map images
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

// Since the EU DMA changes, the map preview on Google Search no longer links to Google Maps
export class GoogleMapsLinks {
  private enabled: boolean;
  private observer: MutationObserver | null = null;
  private scanTimeout: number | null = null;
  private readonly handleClick = this.onClick.bind(this);

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

  private start(): void {
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('auxclick', this.handleClick, true);

    this.observer = new MutationObserver(() => this.scheduleScan());
    this.observer.observe(document.documentElement, { childList: true, subtree: true });
    this.scan();
  }

  private stop(): void {
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('auxclick', this.handleClick, true);

    this.observer?.disconnect();
    this.observer = null;

    if (this.scanTimeout !== null) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }

    document.querySelectorAll<HTMLElement>(`[${MARKER_ATTRIBUTE}]`).forEach(element => {
      element.removeAttribute(MARKER_ATTRIBUTE);
      element.style.cursor = '';
      element.removeAttribute('title');
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

    const images = document.querySelectorAll<HTMLImageElement>(
      MAP_IMAGE_SELECTORS.map(selector => `${selector}:not([${MARKER_ATTRIBUTE}])`).join(',')
    );

    images.forEach(image => {
      if (this.hasMapsLink(image)) {
        return;
      }

      image.setAttribute(MARKER_ATTRIBUTE, '');
      image.style.cursor = 'pointer';
      image.title = 'Open in Google Maps';
    });
  }

  private hasMapsLink(element: Element): boolean {
    const link = element.closest('a[href]') as HTMLAnchorElement | null;
    return !!link && link.href.includes('/maps');
  }

  private onClick(event: MouseEvent): void {
    // Left and middle button only; the right button belongs to gestures
    if (event.button !== 0 && event.button !== 1) {
      return;
    }

    const target = event.target as Element | null;
    const mapElement = target?.closest?.(`[${MARKER_ATTRIBUTE}]`);
    if (!mapElement) {
      return;
    }

    const query = this.getQuery(mapElement);
    if (!query) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    window.open(MAPS_SEARCH_URL + encodeURIComponent(query), '_blank', 'noopener');
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
