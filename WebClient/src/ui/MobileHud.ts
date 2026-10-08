import './MobileHud.css';
import type { LoadedMapSquare } from '../cache/MapSquareLoader';
import { mapTerrainTileIndex } from '../cache/MapTerrainDecoder';
import type { CacheGameUiAssets } from '../cache/CacheGameUiAssets';
import { cacheSpriteCanvas } from '../cache/CacheGameUiAssets';
import { CacheBitmapFont } from './CacheBitmapFont';
import type { Js5Client } from '../cache/Js5Client';
import { CacheInterfaceRenderer } from './CacheInterfaceRenderer';
import { Rev240UiState } from '../protocol/Rev240UiState';

type TabId =
  | 'combat' | 'inventory' | 'equipment' | 'prayer' | 'magic'
  | 'quests' | 'journal' | 'skills' | 'friends' | 'clan'
  | 'emotes' | 'music' | 'settings' | 'account';
type HotkeyId = TabId | 'run' | 'special' | 'drop';

interface HudAction {
  readonly id: TabId;
  readonly name: string;
  readonly icon: string;
}

const MAIN_STONES: readonly HudAction[] = [
  { id: 'combat', name: 'Combat options', icon: 'swords' },
  { id: 'inventory', name: 'Inventory', icon: 'bag' },
  { id: 'equipment', name: 'Worn equipment', icon: 'shirt' },
  { id: 'prayer', name: 'Prayer', icon: 'star' },
  { id: 'magic', name: 'Spellbook', icon: 'sparkle' },
  { id: 'quests', name: 'Quests', icon: 'scroll' },
  { id: 'journal', name: 'Activities', icon: 'book' },
];
const EXTRA_STONES: readonly HudAction[] = [
  { id: 'skills', name: 'Skills', icon: 'bars' },
  { id: 'friends', name: 'Friends', icon: 'people' },
  { id: 'clan', name: 'Clan and chat channels', icon: 'chat' },
  { id: 'emotes', name: 'Emotes', icon: 'person' },
  { id: 'music', name: 'Music', icon: 'music' },
  { id: 'settings', name: 'Settings', icon: 'cog' },
  { id: 'account', name: 'Account', icon: 'shield' },
];
const STONES = [...MAIN_STONES, ...EXTRA_STONES];

/**
 * Classic OSRS interface group ids (verified against archive 3 on demand).
 * These are the cache widget groups, not synthetic web-panel templates.
 * Server IF_OPENSUB bindings will eventually supersede the default map.
 */
const CACHE_TAB_GROUPS: Partial<Record<TabId, number>> = {
  combat: 593, inventory: 149, equipment: 387, prayer: 541,
  magic: 218, quests: 629, journal: 629, skills: 320,
  friends: 429, clan: 707, emotes: 216, music: 239,
  settings: 116, account: 109,
};

// Indices of the classic cache-8 sideicons sprite sheet. Only use a sprite
// when the downloaded sheet contains that frame; leave other actions alone.
const CACHE_SIDE_ICON: Readonly<Record<string, number>> = {
  combat: 0, skills: 1, quests: 2, inventory: 3, equipment: 4,
  prayer: 5, magic: 6, clan: 7, friends: 8, settings: 11,
  emotes: 12, music: 13,
};

const HOTKEY_PROFILES: readonly { name: string; keys: readonly HotkeyId[] }[] = [
  { name: 'PvM', keys: ['run', 'special', 'prayer', 'magic', 'inventory'] },
  { name: 'Bossing', keys: ['run', 'special', 'prayer', 'magic', 'combat'] },
  { name: 'Skilling', keys: ['inventory', 'drop', 'friends', 'magic', 'skills'] },
];
const EXTRA_HOTKEYS: Record<string, { name: string; icon: string }> = {
  run: { name: 'Toggle run (UI only)', icon: 'run' },
  special: { name: 'Special attack (UI only)', icon: 'swords' },
  drop: { name: 'Tap-to-drop (UI only)', icon: 'hand' },
};

const ICONS: Record<string, string> = {
  swords: '<path d="M4 4l7 7m2 2 7 7M3 3l5 1-4 4-1-5zm14 14-3 3m6-16-7 7m-2 2-7 7M21 3l-5 1 4 4 1-5zM7 17l-3 3"/>',
  bag: '<path d="M5 8h14l-1 12H6L5 8zm4 0V6a3 3 0 016 0v2"/><path d="M9 12v4m6-4v4"/>',
  shirt: '<path d="M9 3h6l2 3 5 2-3 5-3-2v10H8V11l-3 2-3-5 5-2 2-3z"/>',
  star: '<path d="M12 2l2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3L12 2z"/>',
  sparkle: '<path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5zM18 2l1 3 3 1-3 1-1 3"/>',
  scroll: '<path d="M5 5a3 3 0 013-3h11v15a3 3 0 01-3 3H6a3 3 0 01-3-3c0-2 3-3 5-2V5M8 6h7M8 10h7M8 14h5"/>',
  book: '<path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1zm0 0v15"/>',
  bars: '<path d="M4 19V12h4v7H4zm6 0V5h4v14h-4zm6 0V9h4v10h-4z"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M2 20v-3a7 7 0 0114 0v3M17 6a3 3 0 010 6m2 2a6 6 0 013 5"/>',
  chat: '<path d="M3 4h18v12h-9l-5 4v-4H3V4zm4 5h10M7 12h7"/>',
  person: '<circle cx="12" cy="4" r="2"/><path d="M12 7v9m0-6L5 13m7-3l7 3m-7 3l-5 6m5-6l5 6"/>',
  music: '<path d="M10 18V5l10-2v13M10 8l10-2"/><ellipse cx="7" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
  cog: '<path d="M10 2h4l1 3 3 1 3-1 2 4-3 2v3l3 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 3-2v-3L1 9l2-4 3 1 3-1 1-3z"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="M12 2l9 4v6c0 5-4 8-9 10-5-2-9-5-9-10V6l9-4zm-4 10l3 3 5-6"/>',
  run: '<circle cx="14" cy="4" r="2"/><path d="M10 9l4-2 3 3 4 1M14 7l-3 6-5 2m5-2l5 3-2 6m-3-9L6 21"/>',
  hand: '<path d="M5 12V9a2 2 0 014 0V4a2 2 0 014 0v5-2a2 2 0 014 0v2a2 2 0 014 0v7c0 4-3 6-7 6H9l-5-7a2 2 0 013-3l2 2"/>',
  logout: '<path d="M10 3H4v18h6M14 7l5 5-5 5m5-5H8"/>',
  chevron: '<path d="M15 5l-7 7 7 7"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M5 9h1m3 0h1m3 0h1m3 0h1M5 13h1m3 0h1m3 0h1m3 0h1M7 16h10"/>',
  compass: '<path d="M12 2l4 10-4-2-4 2 4-10zm0 20l-4-10 4 2 4-2-4 10z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2c-5 5-5 15 0 20 5-5 5-15 0-20"/>',
  xp: '<path d="M4 4l16 16M20 4L4 20"/>',
  heart: '<path d="M12 21L3 12C-1 4 7 1 12 7c5-6 13-3 9 5l-9 9z"/>',
  bolt: '<path d="M14 2L5 13h6l-1 9 9-12h-6l1-8z"/>',
  close: '<path d="M5 5l14 14M19 5L5 19"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
};

function icon(name: string): string {
  return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="1.9" stroke-linecap="round" ' +
    'stroke-linejoin="round">' + (ICONS[name] ?? ICONS.book) + '</svg>';
}

function button(action: string, label: string, glyph: string, extraClass = ''): string {
  return '<button type="button" class="hud-stone ' + extraClass +
    '" data-action="' + action + '" aria-label="' + label +
    '" title="' + label + '">' + icon(glyph) + '</button>';
}

export interface MobileHudOptions {
  readonly onLogout: () => void;
  readonly onCameraNorth: () => void;
  readonly onZoom: (delta: number) => void;
}

/**
 * OSRS mobile's 2024 side-stone/hotkey layout. This is deliberately a UI shell:
 * server-driven inventory, skill, chat and orb packets are not yet decoded.
 */
export class MobileHud {
  private readonly minimap: HTMLCanvasElement;
  private readonly panel: HTMLElement;
  private readonly panelHeading: HTMLElement;
  private readonly panelBody: HTMLElement;
  private readonly profileName: HTMLElement;
  private readonly hotkeys: HTMLElement;
  private readonly chatBox: HTMLElement;
  private readonly chatInput: HTMLInputElement;
  private readonly chatNotice: HTMLElement;
  private readonly extraStones: HTMLElement;
  private readonly playerMarker: HTMLElement;
  private readonly mapSquares = new Map<number, LoadedMapSquare>();
  private cacheFont: CacheBitmapFont | null = null;
  private interfaceRenderer: CacheInterfaceRenderer | null = null;
  private serverUi: Rev240UiState | null = null;
  private activePanelGroup: number | null = null;
  private activeServerConfirmed = false;
  private manuallySelectedGroup: number | null = null;
  private interfaceGroupIds = new Set<number>();
  private cachedIconUrls = new Map<string, string>();
  private selectedTab: TabId | null = null;
  private activeProfile = 0;
  private secondaryOpen = true;
  private chatOpen = true;
  private mapOpen = true;
  private runActive = false;
  private dropActive = false;
  private popoutMode = 0;
  private lastMapKey = '';
  private player: { x: number; z: number; level: number; yaw: number } | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly options: MobileHudOptions,
  ) {
    root.innerHTML = [
      '<div class="hud-top-left">',
      button('logout', 'Logout', 'logout', 'hud-logout'),
      '<div class="hud-chat" id="hud-chat" role="log" aria-label="Game chat">',
      '<div class="hud-chat-line"><span class="hud-chat-system">SoloScape:</span> Game chat awaiting server messages.</div>',
      '</div></div>',
      '<div class="hud-chat-controls">',
      button('chat-toggle', 'Show or hide chat', 'chat'),
      button('chat-keyboard', 'Open chat keyboard', 'keyboard'),
      '<form class="hud-chat-form" id="hud-chat-form" hidden>',
      '<input id="hud-chat-input" aria-label="Chat message" maxlength="80" autocomplete="off" placeholder="Type here..." />',
      '<button type="submit" aria-label="Send chat message">↵</button>',
      '</form><small class="hud-chat-notice" id="hud-chat-notice" aria-live="polite"></small>',
      '</div>',
      '<div class="hud-hotkey-rail" aria-label="Mobile hotkeys">',
      '<div id="hud-hotkeys" class="hud-hotkeys"></div>',
      '<button type="button" id="hud-profile" class="hud-profile" data-action="profile" title="Switch hotkey profile">',
      '<span id="hud-profile-name">PvM</span> ▾</button></div>',
      '<div class="hud-map-cluster">',
      '<div class="hud-orbs">',
      '<div class="hud-orb hud-orb-xp" title="XP tracker">' + icon('xp') + '<span>XP</span></div>',
      '<div class="hud-orb hud-orb-health" title="Hitpoints unavailable">' + icon('heart') + '<span>—</span></div>',
      '<div class="hud-orb hud-orb-prayer" title="Prayer points unavailable">' + icon('star') + '<span>—</span></div>',
      '<div class="hud-orb hud-orb-run" id="hud-run-orb" title="Run energy unavailable">' + icon('run') + '<span>—</span></div>',
      '<div class="hud-orb hud-orb-special" title="Special attack unavailable">' + icon('swords') + '<span>—</span></div>',
      '</div>',
      button('north', 'Face camera north', 'compass', 'hud-compass'),
      '<button type="button" class="hud-map-frame" data-action="map" aria-label="Toggle minimap" title="Toggle minimap">',
      '<canvas id="hud-minimap" width="160" height="160"></canvas>',
      '<span id="hud-player-marker" class="hud-player-marker"></span></button>',
      button('zoom-in', 'Zoom camera in', 'close', 'hud-zoom hud-zoom-in'),
      button('zoom-out', 'Zoom camera out', 'close', 'hud-zoom hud-zoom-out'),
      button('map', 'Toggle minimap', 'globe', 'hud-globe'),
      '</div>',
      '<div class="hud-side-stones" aria-label="Game tabs">',
      '<div class="hud-stones-primary">',
      MAIN_STONES.map((stone) => button('tab:' + stone.id, stone.name, stone.icon)).join(''),
      '</div><div class="hud-stones-secondary" id="hud-extra-stones">',
      EXTRA_STONES.map((stone) => button('tab:' + stone.id, stone.name, stone.icon)).join(''),
      '</div>',
      button('stones-toggle', 'Collapse secondary tabs', 'chevron', 'hud-collapse'),
      '</div>',
      '<section class="hud-panel" id="hud-panel" aria-label="Game panel" hidden>',
      '<header class="hud-panel-title"><span id="hud-panel-heading"></span>',
      button('panel-close', 'Close panel', 'close'),
      '</header><div id="hud-panel-body" class="hud-panel-body"></div></section>',
      '<div class="hud-popout">',
      button('popout', 'Cycle popout panel', 'bars', 'hud-popout-button'),
      '<div class="hud-popout-content" id="hud-popout-content" hidden>',
      '<span>XP Tracker</span><small>Waiting for XP updates</small></div>',
      '</div>',
    ].join('');

    this.minimap = this.require<HTMLCanvasElement>('#hud-minimap');
    this.panel = this.require<HTMLElement>('#hud-panel');
    this.panelHeading = this.require<HTMLElement>('#hud-panel-heading');
    this.panelBody = this.require<HTMLElement>('#hud-panel-body');
    this.profileName = this.require<HTMLElement>('#hud-profile-name');
    this.hotkeys = this.require<HTMLElement>('#hud-hotkeys');
    this.chatBox = this.require<HTMLElement>('#hud-chat');
    this.chatInput = this.require<HTMLInputElement>('#hud-chat-input');
    this.chatNotice = this.require<HTMLElement>('#hud-chat-notice');
    this.extraStones = this.require<HTMLElement>('#hud-extra-stones');
    this.playerMarker = this.require<HTMLElement>('#hud-player-marker');
    root.addEventListener('click', (event) => {
      const target = event.target as Element;
      const control = target.closest<HTMLButtonElement>('[data-action]');
      if (control && root.contains(control)) {
        this.handleAction(control.dataset.action ?? '');
      }
    });
    this.require<HTMLFormElement>('#hud-chat-form').addEventListener('submit', (event) => {
      event.preventDefault();
      this.chatNotice.textContent = 'Chat sending is not connected yet.';
    });
    this.renderHotkeys();
    this.drawMinimap();
  }

  /**
   * Replace vector placeholders with original JS5 archive-8 sprite frames.
   * Use the original cached b12 bitmap font for panel headings.
   */
  setCacheAssets(assets: CacheGameUiAssets, js5: Js5Client): void {
    this.interfaceRenderer?.cancel();
    this.interfaceRenderer = new CacheInterfaceRenderer(
      js5, assets.interfaces, assets.bold12, this.serverUi ?? new Rev240UiState(),
    );
    this.interfaceGroupIds = new Set(assets.interfaces.availableGroupIds);
    this.cacheFont = new CacheBitmapFont(assets.bold12);
    this.cachedIconUrls.clear();
    for (const [tab, index] of Object.entries(CACHE_SIDE_ICON)) {
      const sprite = assets.sideIcons[index];
      if (!sprite) continue;
      this.cachedIconUrls.set(tab, cacheSpriteCanvas(sprite).toDataURL('image/png'));
    }
    this.applyCacheIcons();
    if (this.selectedTab) {
      this.renderPanelHeading(STONES.find((stone) => stone.id === this.selectedTab)?.name ??
        this.selectedTab);
      this.renderCachedPanel(this.selectedTab);
    }
  }

  setServerUi(server: Rev240UiState): void {
    this.serverUi = server;
  }

  refreshServerUi(): void {
    const energy = this.serverUi?.runEnergy;
    const orb = this.require<HTMLElement>('#hud-run-orb');
    const label = orb.querySelector('span');
    if (label) {
      label.textContent = energy === null || energy === undefined
        ? '—' : String(Math.min(100, Math.floor(energy / 100))) + '%';
      orb.title = energy === null || energy === undefined
        ? 'Run energy unavailable' : 'Run energy ' + energy + ' / 10000';
    }
    this.interfaceRenderer?.refreshServerState();
    if (this.selectedTab === 'skills') this.renderLiveSkills();
    if (this.selectedTab && this.serverUi) {
      const hinted = CACHE_TAB_GROUPS[this.selectedTab];
      const manuallyOpened = this.manuallySelectedGroup !== null &&
        [...this.serverUi.subInterfaces.values()].some(
          (sub) => sub.groupId === this.manuallySelectedGroup);
      const desired = manuallyOpened ? this.manuallySelectedGroup : hinted;
      const confirmed = desired !== undefined && desired !== null &&
        [...this.serverUi.subInterfaces.values()].some((sub) => sub.groupId === desired);
      const group = desired !== undefined && desired !== null &&
        this.interfaceGroupIds.has(desired) ? desired : null;
      if (group !== this.activePanelGroup ||
        confirmed !== this.activeServerConfirmed) {
        this.renderCachedPanel(this.selectedTab);
      }
    }
  }

  private renderLiveSkills(): void {
    if (this.selectedTab !== 'skills') return;
    let view = this.panelBody.querySelector<HTMLElement>('.hud-live-skills');
    if (!view) {
      view = document.createElement('div');
      view.className = 'hud-live-skills';
      this.panelBody.append(view);
    }
    const skills = this.serverUi?.skills;
    view.replaceChildren();
    if (!skills?.size) {
      view.textContent = 'Waiting for UPDATE_STAT_V2 packets.';
      return;
    }
    const names = [
      'Attack', 'Defence', 'Strength', 'Hitpoints', 'Ranged', 'Prayer',
      'Magic', 'Cooking', 'Woodcutting', 'Fletching', 'Fishing',
      'Firemaking', 'Crafting', 'Smithing', 'Mining', 'Herblore',
      'Agility', 'Thieving', 'Slayer', 'Farming', 'Runecraft',
      'Hunter', 'Construction', 'Sailing',
    ];
    view.setAttribute('aria-label', 'Live server skill levels');
    for (const [id, stat] of [...skills].sort((a, b) => a[0] - b[0])) {
      const cell = document.createElement('span');
      cell.className = 'hud-live-skill';
      cell.textContent = (names[id] ?? 'Skill ' + id) + ': ' +
        stat.currentLevel + ' (' + stat.experience.toLocaleString('en-GB') + ' XP)';
      view.append(cell);
    }
  }

  private applyCacheIcons(): void {
    if (!this.cachedIconUrls.size) return;
    for (const control of this.root.querySelectorAll<HTMLButtonElement>(
      '[data-action^="tab:"], [data-action^="hotkey:"]',
    )) {
      const key = control.dataset.action?.split(':')[1] ?? '';
      const url = this.cachedIconUrls.get(key);
      if (!url) continue;
      const previous = control.querySelector('svg');
      if (!previous) continue;
      const image = document.createElement('img');
      image.className = 'cache-hud-icon';
      image.alt = '';
      image.src = url;
      previous.replaceWith(image);
    }
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
      this.player = null;
      this.mapSquares.clear();
      this.lastMapKey = '';
    }
  }

  setMaps(maps: readonly LoadedMapSquare[]): void {
    this.mapSquares.clear();
    for (const map of maps) {
      this.mapSquares.set(map.mapSquare.id, map);
    }
    this.lastMapKey = '';
    this.drawMinimap();
  }

  setPlayer(position: { x: number; z: number; level: number; yaw: number } | null): void {
    this.player = position;
    const key = position
      ? [position.x, position.z, position.level, Math.floor(position.yaw / 24)].join(':')
      : 'none';
    if (key !== this.lastMapKey) {
      this.lastMapKey = key;
      this.drawMinimap();
    }
  }

  private require<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) {
      throw new Error('Mobile HUD missing ' + selector);
    }
    return element;
  }

  private renderHotkeys(): void {
    const profile = HOTKEY_PROFILES[this.activeProfile]!;
    this.profileName.textContent = profile.name;
    this.hotkeys.innerHTML = profile.keys.map((key) => {
      const stone = STONES.find((entry) => entry.id === key);
      const info = stone ?? EXTRA_HOTKEYS[key]!;
      const pressed = key === 'run' ? this.runActive : key === 'drop' ? this.dropActive : false;
      return button('hotkey:' + key, info.name, info.icon,
        'hud-hotkey' + (pressed ? ' is-active' : ''));
    }).join('');
    this.updateActiveTab();
    this.applyCacheIcons();
  }

  private handleAction(action: string): void {
    if (action.startsWith('tab:') || action.startsWith('hotkey:')) {
      const key = action.substring(action.indexOf(':') + 1) as HotkeyId;
      if (key === 'run') {
        this.runActive = !this.runActive;
        this.require<HTMLElement>('#hud-run-orb').classList.toggle('is-active', this.runActive);
        this.renderHotkeys();
      } else if (key === 'drop') {
        this.dropActive = !this.dropActive;
        this.renderHotkeys();
      } else if (key === 'special') {
        this.chatNotice.textContent = 'Special attack is not connected yet.';
      } else {
        this.togglePanel(key);
      }
      return;
    }

    switch (action) {
      case 'logout':
        this.options.onLogout();
        break;
      case 'profile':
        this.activeProfile = (this.activeProfile + 1) % HOTKEY_PROFILES.length;
        this.renderHotkeys();
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
  private renderCachedPanel(tab: TabId): void {
    const hintedId = CACHE_TAB_GROUPS[tab];
    const open = [...(this.serverUi?.subInterfaces.values() ?? [])]
      .filter((value) => this.interfaceGroupIds.has(value.groupId));
    const manuallyOpened = this.manuallySelectedGroup !== null
      ? open.find((value) => value.groupId === this.manuallySelectedGroup)
      : undefined;
    const matchingOpen = manuallyOpened ??
      open.find((value) => value.groupId === hintedId);
    const groupId = matchingOpen?.groupId ??
      (hintedId !== undefined && this.interfaceGroupIds.has(hintedId)
        ? hintedId : null);
    this.activePanelGroup = groupId;
    this.activeServerConfirmed = Boolean(matchingOpen);

    if (!this.interfaceRenderer) {
      this.panelBody.textContent = 'Loading original game interfaces from cache...';
      return;
    }
    if (groupId === null) {
      this.panelBody.replaceChildren();
      const notice = document.createElement('p');
      notice.textContent = 'No confirmed cache group for this tab.';
      this.panelBody.append(notice);
      this.offerAttachedInterfaceChoices(open);
      return;
    }
    const renderer = this.interfaceRenderer;
    void renderer.show(groupId, this.panelBody).then(() => {
      if (this.selectedTab !== tab || this.activePanelGroup !== groupId) return;
      if (!matchingOpen) {
        const status = document.createElement('small');
        status.className = 'hud-cache-unverified';
        status.textContent = 'Historic interface ' + groupId +
          ' — not yet confirmed by server interface binding.';
        this.panelBody.prepend(status);
        this.offerAttachedInterfaceChoices(open);
      }
      if (tab === 'skills') this.renderLiveSkills();
    });
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

  /**
   * Renders an intentionally approximate terrain-only minimap using the
   * server-supplied cache maps. Accurate mapscene sprites/markers are future work.
   */
  private drawMinimap(): void {
    const ctx = this.minimap.getContext('2d');
    if (!ctx) return;
    const size = this.minimap.width;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#4b5741';
    ctx.fillRect(0, 0, size, size);
    if (!this.player) {
      this.playerMarker.hidden = true;
      return;
    }
    this.playerMarker.hidden = false;
    const { x, z, level, yaw } = this.player;
    const step = 3;
    const radius = 27;
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(-yaw * Math.PI * 2 / 2048);
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        const tileX = x + dx;
        const tileZ = z + dz;
        const regionX = Math.floor(tileX / 64);
        const regionZ = Math.floor(tileZ / 64);
        const map = this.mapSquares.get((regionX << 8) | regionZ);
        if (!map) continue;
        const index = mapTerrainTileIndex(
          Math.max(0, Math.min(3, level)),
          ((tileX % 64) + 64) % 64,
          ((tileZ % 64) + 64) % 64,
        );
        const underlay = map.terrain.underlayIds[index] ?? -1;
        const overlay = map.terrain.overlayIds[index] ?? -1;
        const flag = map.terrain.renderFlags[index] ?? 0;
        // Cache terrain material ids are not RGB values. Distinct muted shades
        // convey terrain variation without inventing actual OSRS mapscene art.
        ctx.fillStyle = overlay >= 0
          ? ['#77766b', '#a2a18d', '#6a756b'][overlay % 3]!
          : underlay >= 0
            ? ['#60724b', '#657a50', '#546a44', '#738257'][underlay % 4]!
            : flag > 0 ? '#6c6b60' : '#4d6044';
        ctx.fillRect(dx * step - step / 2, -dz * step - step / 2, step + 0.5, step + 0.5);
      }
    }
    ctx.restore();
  }
}
