import './MobileHud.css';
import type { LoadedMapSquare } from '../cache/MapSquareLoader';
import type { SceneFloorMaterials } from '../cache/SceneMaterialLoader';
import { paintCacheTerrainMinimap } from './CacheTerrainMinimap';
import type { CacheGameUiAssets } from '../cache/CacheGameUiAssets';
import { cacheSpriteCanvas, loadNamedHudSprite } from '../cache/CacheGameUiAssets';
import { CacheBitmapFont } from './CacheBitmapFont';
import type { Js5Client } from '../cache/Js5Client';
import { CacheInterfaceRenderer } from './CacheInterfaceRenderer';
import { CacheMobileHudArt } from './CacheMobileHudArt';
import { Rev240UiState } from '../protocol/Rev240UiState';

type TabId =
  | 'combat' | 'inventory' | 'equipment' | 'prayer' | 'magic'
  | 'quests' | 'journal' | 'skills' | 'friends' | 'clan'
  | 'emotes' | 'music' | 'settings' | 'account';

interface HudAction {
  readonly id: TabId;
  readonly name: string;
}

const MAIN_STONES: readonly HudAction[] = [
  { id: 'combat', name: 'Combat options' },
  { id: 'inventory', name: 'Inventory' },
  { id: 'equipment', name: 'Worn equipment' },
  { id: 'prayer', name: 'Prayer' },
  { id: 'magic', name: 'Spellbook' },
  { id: 'quests', name: 'Quests' },
  { id: 'journal', name: 'Activities' },
];
const EXTRA_STONES: readonly HudAction[] = [
  { id: 'skills', name: 'Skills' },
  { id: 'friends', name: 'Friends' },
  { id: 'clan', name: 'Clan and chat channels' },
  { id: 'emotes', name: 'Emotes' },
  { id: 'music', name: 'Music' },
  { id: 'settings', name: 'Settings' },
  { id: 'account', name: 'Account' },
];
const STONES = [...MAIN_STONES, ...EXTRA_STONES];

/**
 * xrsps reference: server/src/widgets/viewport/mobile.ts (toplevel_osm).
 * Destinations identify which server-OPENED interface belongs to a tab.
 * Unlike a historical groupId, the destination is authoritative in mobile
 * root 601 and survives replacement with bank/shop/other group content.
 */
const MOBILE_TAB_DESTINATIONS: Partial<Record<TabId, number>> = {
  combat: 116, skills: 117, quests: 118, journal: 118,
  inventory: 119, equipment: 120, prayer: 121, magic: 122,
  clan: 123, account: 124, friends: 125,
  settings: 127, emotes: 128, music: 129,
};

/**
 * Only accessible hit targets remain here. All visible game icons are
 * decoded from JS5 widget sprite definitions, never drawn in HTML/SVG.
 */
function button(action: string, label: string, extraClass = ''): string {
  return '<button type="button" class="hud-stone hud-hitbox ' + extraClass +
    '" data-action="' + action + '" aria-label="' + label +
    '" title="' + label + '"></button>';
}

export interface MobileHudOptions {
  readonly onLogout: () => void;
  readonly onCameraNorth: () => void;
  readonly onZoom: (delta: number) => void;
  readonly onCacheArtStatus?: (status: string) => void;
  readonly onHudAction?: (action: string) => void;
}

/**
 * Cache-native game HUD: only transparent interactive targets and
 * verified original JS5 interface sprites may be shown.
 */
export class MobileHud {
  private readonly minimap: HTMLCanvasElement;
  private readonly mapSquares = new Map<number, LoadedMapSquare>();
  private floorMaterials: SceneFloorMaterials | null = null;
  private mapPlayer: {x: number; z: number; level: number; yaw: number} | null = null;
  private minimapRenderKey = '';
  private readonly panel: HTMLElement;
  private readonly panelHeading: HTMLElement;
  private readonly panelBody: HTMLElement;
  private readonly chatBox: HTMLElement;
  private readonly chatInput: HTMLInputElement;
  private readonly chatNotice: HTMLElement;
  private readonly extraStones: HTMLElement;
  private cacheFont: CacheBitmapFont | null = null;
  private cacheHudArt: CacheMobileHudArt | null = null;
  private cacheArtSequence = 0;
  private interfaceRenderer: CacheInterfaceRenderer | null = null;
  private serverUi: Rev240UiState | null = null;
  private activePanelGroup: number | null = null;
  private activeServerConfirmed = false;
  private manuallySelectedGroup: number | null = null;
  private interfaceGroupIds = new Set<number>();
  private selectedTab: TabId | null = null;
  private secondaryOpen = true;
  private chatOpen = true;
  private mapOpen = true;
  private popoutMode = 0;

  constructor(
    private readonly root: HTMLElement,
    private readonly options: MobileHudOptions,
  ) {
    root.innerHTML = [
      '<div class="hud-top-left">',
      button('logout', 'Logout', 'hud-logout'),
      '<div class="hud-chat" id="hud-chat" role="log" aria-label="Game chat">',
      '</div></div>',
      '<div class="hud-chat-controls">',
      button('chat-toggle', 'Show or hide chat'),
      button('chat-keyboard', 'Open chat keyboard'),
      '<form class="hud-chat-form" id="hud-chat-form" hidden>',
      '<input id="hud-chat-input" aria-label="Chat message" maxlength="80" autocomplete="off" placeholder="Type here..." />',
      '<button type="submit" aria-label="Send chat message">↵</button>',
      '</form><small class="hud-chat-notice" id="hud-chat-notice" aria-live="polite"></small>',
      '</div>',
      '<div class="hud-map-cluster">',
      '<div class="hud-orbs">',
      '<div class="hud-orb hud-orb-xp" aria-label="XP tracker"></div>',
      '<div class="hud-orb hud-orb-health" aria-label="Hitpoints unavailable"></div>',
      '<div class="hud-orb hud-orb-prayer" aria-label="Prayer points unavailable"></div>',
      '<div class="hud-orb hud-orb-run" id="hud-run-orb" aria-label="Run energy unavailable"></div>',
      '<div class="hud-orb hud-orb-special" aria-label="Special attack unavailable"></div>',
      '</div>',
      button('north', 'Face camera north', 'hud-compass'),
      '<button type="button" class="hud-map-frame" data-action="map" aria-label="Toggle minimap" title="Toggle minimap">',
      '<canvas id="hud-minimap" width="160" height="160"></canvas>',
      '</button>',
      button('zoom-in', 'Zoom camera in', 'hud-zoom hud-zoom-in'),
      button('zoom-out', 'Zoom camera out', 'hud-zoom hud-zoom-out'),
      button('map', 'Toggle minimap', 'hud-globe'),
      '</div>',
      '<div class="hud-side-stones" aria-label="Game tabs">',
      '<div class="hud-stones-primary">',
      MAIN_STONES.map((stone) => button('tab:' + stone.id, stone.name)).join(''),
      '</div><div class="hud-stones-secondary" id="hud-extra-stones">',
      EXTRA_STONES.map((stone) => button('tab:' + stone.id, stone.name)).join(''),
      '</div>',
      button('stones-toggle', 'Collapse secondary tabs', 'hud-collapse'),
      '</div>',
      '<section class="hud-panel" id="hud-panel" aria-label="Game panel" hidden>',
      '<header class="hud-panel-title"><span id="hud-panel-heading"></span>',
      button('panel-close', 'Close panel'),
      '</header><div id="hud-panel-body" class="hud-panel-body"></div></section>',
      '<div class="hud-popout">',
      button('popout', 'Cycle popout panel', 'hud-popout-button'),
      '<div class="hud-popout-content" id="hud-popout-content" hidden>',
      '</div>',
      '</div>',
    ].join('');

    this.minimap = this.require<HTMLCanvasElement>('#hud-minimap');
    this.panel = this.require<HTMLElement>('#hud-panel');
    this.panelHeading = this.require<HTMLElement>('#hud-panel-heading');
    this.panelBody = this.require<HTMLElement>('#hud-panel-body');
    this.chatBox = this.require<HTMLElement>('#hud-chat');
    this.chatInput = this.require<HTMLInputElement>('#hud-chat-input');
    this.chatNotice = this.require<HTMLElement>('#hud-chat-notice');
    this.extraStones = this.require<HTMLElement>('#hud-extra-stones');
    root.addEventListener('click', (event) => {
      const target = event.target as Element;
      const control = target.closest<HTMLButtonElement>('[data-action]');
      if (control && root.contains(control)) {
        const action = control.dataset.action ?? '';
        this.options.onHudAction?.(action);
        // These are semantic DOM hit targets, not cache-sourced sprite
        // widgets. Do not let a button click become a world-walk click.
        event.stopPropagation();
        this.handleAction(action);
      }
    });
    this.require<HTMLFormElement>('#hud-chat-form').addEventListener('submit', (event) => {
      event.preventDefault();
      this.chatNotice.textContent = 'Chat sending is not connected yet.';
    });
    this.clearMinimap();
  }

  /** Attach decoded cache widgets and original archive-8 sprites. */
  setCacheAssets(assets: CacheGameUiAssets, js5: Js5Client): void {
    this.interfaceRenderer?.cancel();
    this.cacheHudArt?.dispose();
    this.root.classList.remove('hud-cache-art-active');
    const previous = this.root.querySelector('#hud-cache-art');
    previous?.remove();
    const artHost = document.createElement('div');
    artHost.id = 'hud-cache-art';
    artHost.setAttribute('aria-hidden', 'true');
    this.root.prepend(artHost);
    const art = new CacheMobileHudArt(this.root, artHost, js5, assets.interfaces);
    if (this.serverUi) art.setServerState(this.serverUi);
    this.cacheHudArt = art;
    const sequence = ++this.cacheArtSequence;
    void art.load().then((loaded) => {
      if (sequence !== this.cacheArtSequence || this.cacheHudArt !== art) return;
      // Only enable cache-native visuals if actual cached sprite artwork
      // could be decoded. The HTML controls remain for mouse/touch input.
      this.root.classList.toggle('hud-cache-art-active', loaded);
      this.options.onCacheArtStatus?.(loaded
        ? 'Cache-native mobile art enabled (archive-3 groups ' +
          art.groups.join(',') + '; sprites=' + art.visibleSpriteCount +
          '). Mobile widget actions/CS2 still require implementation.'
        : 'Cache-native mobile sprites unavailable; ' +
          'keeping transparent accessible controls only.');
    }).catch((error: unknown) => {
      if (this.cacheHudArt !== art) return;
      const message = error instanceof Error ? error.message : String(error);
      this.options.onCacheArtStatus?.('Cache-native mobile art unavailable: ' + message);
      console.warn('Unable to render cache-native mobile frame:', error);
      this.root.classList.remove('hud-cache-art-active');
    });
    this.interfaceRenderer = new CacheInterfaceRenderer(
      js5, assets.interfaces, assets.bold12, this.serverUi ?? new Rev240UiState(),
    );
    this.interfaceGroupIds = new Set(assets.interfaces.availableGroupIds);
    this.cacheFont = new CacheBitmapFont(assets.bold12);
    const compass = this.require<HTMLButtonElement>('[data-action="north"]');
    // Name hashes are checked against archive 8, no guessed sprite ID.
    void loadNamedHudSprite(js5, 'compass')
      .then((frame) => {
        if (this.cacheHudArt !== art || !frame) return;
        const image = document.createElement('img');
        image.className = 'hud-cache-compass';
        image.alt = '';
        image.src = cacheSpriteCanvas(frame, true).toDataURL('image/png');
        compass.replaceChildren(image);
      })
      .catch((error: unknown) => {
        this.options.onCacheArtStatus?.('Original cache compass unavailable: ' +
          (error instanceof Error ? error.message : String(error)));
      });
    this.refreshServerUi();
    if (this.selectedTab) {
      this.renderPanelHeading(STONES.find((stone) => stone.id === this.selectedTab)?.name ??
        this.selectedTab);
      this.renderCachedPanel(this.selectedTab);
    }
  }

  setServerUi(server: Rev240UiState): void {
    this.serverUi = server;
    this.cacheHudArt?.setServerState(server);
  }

  refreshServerUi(): void {
    const energy = this.serverUi?.runEnergy;
    const orb = this.require<HTMLElement>('#hud-run-orb');
    orb.title = energy === null || energy === undefined
      ? 'Run energy unavailable' : 'Run energy ' + energy + ' / 10000';
    orb.setAttribute('aria-label', orb.title);
    this.renderCachedOrbValue('health', this.serverUi?.skills.get(3)?.currentLevel);
    this.renderCachedOrbValue('prayer', this.serverUi?.skills.get(5)?.currentLevel);
    this.cacheHudArt?.refreshServerVisibility();
    this.interfaceRenderer?.refreshServerState();
    if (this.selectedTab && this.serverUi) {
      const resolved = this.resolveTabInterface(this.selectedTab);
      if (resolved.groupId !== this.activePanelGroup ||
        resolved.confirmed !== this.activeServerConfirmed) {
        this.renderCachedPanel(this.selectedTab);
      }
    }
  }

  private renderCachedOrbValue(name: 'health' | 'prayer', value: number | undefined): void {
    const orb = this.require<HTMLElement>('.hud-orb-' + name);
    const label = name === 'health' ? 'Hitpoints' : 'Prayer';
    orb.setAttribute('aria-label', label +
      (value === undefined ? ' awaiting server stat update' : ': ' + value));
    orb.title = orb.getAttribute('aria-label') ?? label;
    orb.replaceChildren();
    if (value === undefined || !this.cacheFont) return;
    const font = this.cacheFont;
    const text = String(value);
    const canvas = document.createElement('canvas');
    canvas.className = 'hud-cache-orb-value';
    canvas.width = Math.max(16, font.measure(text) + 3);
    canvas.height = 16;
    const context = canvas.getContext('2d');
    if (!context) return;
    font.draw(context, text, 1, 14, 0xffffff);
    orb.append(canvas);
  }

  private renderPanelHeading(label: string): void {
    if (!this.cacheFont) {
      this.panelHeading.textContent = label;
      return;
    }
    const font = this.cacheFont;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, font.measure(label) + 2);
    canvas.height = 23;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
    const context = canvas.getContext('2d');
    if (!context) {
      this.panelHeading.textContent = label;
      return;
    }
    font.draw(context, label, 1, 18, 0xe6b761);
    this.panelHeading.replaceChildren(canvas);
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
    this.root.parentElement?.classList.toggle('in-game', visible);
    if (!visible) {
      this.closePanel();
      this.require<HTMLFormElement>('#hud-chat-form').hidden = true;
      this.chatNotice.textContent = '';
      this.mapPlayer = null;
      this.minimapRenderKey = '';
    }
  }

  // Until the authentic minimap renderer is implemented, never invent
  // terrain colours, mapscene sprites or a player marker.
  setMaps(maps: readonly LoadedMapSquare[]): void {
    this.mapSquares.clear();
    for (const map of maps) this.mapSquares.set(map.mapSquare.id, map);
    this.floorMaterials = null;
    this.minimapRenderKey = '';
    this.clearMinimap();
  }

  setFloorMaterials(materials: SceneFloorMaterials | null): void {
    this.floorMaterials = materials;
    this.minimapRenderKey = '';
    this.renderMinimap();
  }

  setPlayer(position: { x: number; z: number; level: number; yaw: number } | null): void {
    this.mapPlayer = position;
    const key = position
      ? [position.x, position.z, position.level, Math.floor(position.yaw / 24)].join(':')
      : 'none';
    if (key === this.minimapRenderKey) return;
    this.minimapRenderKey = key;
    this.renderMinimap();
  }

  private renderMinimap(): void {
    if (!this.floorMaterials) {
      this.clearMinimap();
      return;
    }
    paintCacheTerrainMinimap(this.minimap, this.mapSquares, this.floorMaterials,
      this.mapPlayer);
  }

  private require<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) {
      throw new Error('Mobile HUD missing ' + selector);
    }
    return element;
  }

  private handleAction(action: string): void {
    if (action.startsWith('tab:')) {
      const tab = action.slice(4) as TabId;
      if (STONES.some((entry) => entry.id === tab)) this.togglePanel(tab);
      return;
    }

    switch (action) {
      case 'logout':
        // A misplaced transparent hitbox must never terminate a live
        // session with one accidental click.
        if (window.confirm('Log out of SoloScape?')) this.options.onLogout();
        break;
      case 'stones-toggle':
        this.secondaryOpen = !this.secondaryOpen;
        this.extraStones.hidden = !this.secondaryOpen;
        this.root.classList.toggle('hud-stones-collapsed', !this.secondaryOpen);
        if (!this.secondaryOpen && this.selectedTab &&
          EXTRA_STONES.some((stone) => stone.id === this.selectedTab)) {
          this.closePanel();
        }
        break;
      case 'panel-close':
        this.closePanel();
        break;
      case 'chat-toggle':
        this.chatOpen = !this.chatOpen;
        this.chatBox.hidden = !this.chatOpen;
        break;
      case 'chat-keyboard': {
        const form = this.require<HTMLFormElement>('#hud-chat-form');
        form.hidden = !form.hidden;
        if (!form.hidden) this.chatInput.focus();
        break;
      }
      case 'popout': {
        this.popoutMode = (this.popoutMode + 1) % 3;
        const content = this.require<HTMLElement>('#hud-popout-content');
        content.hidden = this.popoutMode === 0;
        content.classList.toggle('is-full', this.popoutMode === 2);
        break;
      }
      case 'map':
        this.mapOpen = !this.mapOpen;
        this.root.classList.toggle('hud-map-collapsed', !this.mapOpen);
        break;
      case 'north':
        this.options.onCameraNorth();
        break;
      case 'zoom-in':
        this.options.onZoom(-100);
        break;
      case 'zoom-out':
        this.options.onZoom(100);
        break;
    }
  }

  private togglePanel(tab: TabId): void {
    if (this.selectedTab === tab) {
      this.closePanel();
      return;
    }
    this.selectedTab = tab;
    this.manuallySelectedGroup = null;
    this.panel.hidden = false;
    this.renderPanelHeading(STONES.find((entry) => entry.id === tab)?.name ?? tab);
    this.renderCachedPanel(tab);
    this.updateActiveTab();
  }

  private closePanel(): void {
    this.interfaceRenderer?.cancel();
    this.activePanelGroup = null;
    this.activeServerConfirmed = false;
    this.manuallySelectedGroup = null;
    this.selectedTab = null;
    this.panel.hidden = true;
    this.updateActiveTab();
  }

  private updateActiveTab(): void {
    for (const control of this.root.querySelectorAll<HTMLButtonElement>('[data-action^="tab:"], [data-action^="hotkey:"]')) {
      const id = control.dataset.action?.split(':')[1];
      const active = id === this.selectedTab;
      control.classList.toggle('is-selected', active);
      control.setAttribute('aria-pressed', String(active));
    }
  }

  /**
   * Actual sidebar content is downloaded from cache archive 3. No HTML
   * inventory / prayer / skills slots are fabricated when it is missing.
   */
  private resolveTabInterface(tab: TabId): {
    groupId: number | null;
    confirmed: boolean;
  } {
    const open = [...(this.serverUi?.subInterfaces.values() ?? [])]
      .filter((entry) => this.interfaceGroupIds.has(entry.groupId));
    if (this.manuallySelectedGroup !== null) {
      const manual = open.find((entry) => entry.groupId === this.manuallySelectedGroup);
      if (manual) return { groupId: manual.groupId, confirmed: true };
    }
    // Only live revision-240 server destination attachments determine
    // the widget group, never historical default group ids.
    const child = MOBILE_TAB_DESTINATIONS[tab];
    if (this.serverUi?.topLevelInterface === 601 && child !== undefined) {
      const mounted = this.serverUi.subInterfaces.get((601 << 16) | child);
      if (mounted && this.interfaceGroupIds.has(mounted.groupId)) {
        return { groupId: mounted.groupId, confirmed: true };
      }
    }
    return { groupId: null, confirmed: false };
  }

  private renderCachedPanel(tab: TabId): void {
    const open = [...(this.serverUi?.subInterfaces.values() ?? [])]
      .filter((entry) => this.interfaceGroupIds.has(entry.groupId));
    const resolved = this.resolveTabInterface(tab);
    const groupId = resolved.groupId;
    this.activePanelGroup = groupId;
    this.activeServerConfirmed = resolved.confirmed;

    if (!this.interfaceRenderer) {
      this.panelBody.textContent = 'Loading original game interfaces from cache...';
      return;
    }
    if (groupId === null) {
      this.panelBody.replaceChildren();
      const notice = document.createElement('p');
      notice.textContent = 'No server-opened cache interface for this tab.';
      this.panelBody.append(notice);
      this.offerAttachedInterfaceChoices(open);
      return;
    }
    const renderer = this.interfaceRenderer;
    void renderer.show(groupId, this.panelBody);
  }

  private offerAttachedInterfaceChoices(open: ReadonlyArray<{groupId: number; destination: number}>): void {
    const groups = [...new Set(open.map((value) => value.groupId))];
    if (!groups.length) return;
    const select = document.createElement('select');
    select.className = 'hud-server-interface-select';
    select.setAttribute('aria-label', 'Choose server-opened interface');
    const heading = document.createElement('option');
    heading.value = '';
    heading.textContent = 'Server-opened interfaces…';
    select.append(heading);
    for (const group of groups) {
      const option = document.createElement('option');
      option.value = String(group);
      option.textContent = 'Interface ' + group + ' (from server)';
      select.append(option);
    }
    select.addEventListener('change', () => {
      const id = Number(select.value);
      if (!Number.isInteger(id) || !this.interfaceGroupIds.has(id)) return;
      this.manuallySelectedGroup = id;
      if (this.selectedTab) this.renderCachedPanel(this.selectedTab);
    });
    this.panelBody.append(select);
  }

  private clearMinimap(): void {
    const context = this.minimap.getContext('2d');
    if (context) {
      context.clearRect(0, 0, this.minimap.width, this.minimap.height);
    }
  }
}
