import './MobileHud.css';
import type { LoadedMapSquare } from '../cache/MapSquareLoader';
import { mapTerrainTileIndex } from '../cache/MapTerrainDecoder';

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
    this.panel.hidden = false;
    this.panelHeading.textContent = STONES.find((entry) => entry.id === tab)?.name ?? tab;
    this.panelBody.innerHTML = this.buildPanel(tab);
    this.updateActiveTab();
  }

  private closePanel(): void {
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

  private buildPanel(tab: TabId): string {
    const note = '<p class="hud-pending">Awaiting game interface packets</p>';
    if (tab === 'inventory') {
      return '<div class="hud-inventory-grid" aria-label="28 inventory slots">' +
        Array.from({ length: 28 }, (_, i) =>
          '<div class="hud-item-slot" aria-label="Empty slot ' + (i + 1) + '"></div>').join('') +
        '</div>' + note;
    }
    if (tab === 'skills') {
      const skills = [
        'Attack', 'Hitpoints', 'Mining', 'Strength', 'Agility', 'Smithing',
        'Defence', 'Herblore', 'Fishing', 'Ranged', 'Thieving', 'Cooking',
        'Prayer', 'Crafting', 'Firemaking', 'Magic', 'Fletching', 'Woodcutting',
        'Runecraft', 'Slayer', 'Farming', 'Construction', 'Hunter', 'Sailing',
      ];
      return '<div class="hud-skills-grid">' +
        skills.map((skill) => '<div class="hud-skill" title="' + skill +
          '"><span>' + skill.slice(0, 2) + '</span><b>—/—</b></div>').join('') +
        '</div>' + note;
    }
    if (tab === 'equipment') {
      return '<div class="hud-equipment-grid">' +
        Array.from({ length: 11 }, () => '<div class="hud-equip-slot"></div>').join('') +
        '</div>' + note;
    }
    if (tab === 'prayer' || tab === 'magic' || tab === 'emotes') {
      return '<div class="hud-spell-grid">' +
        Array.from({ length: tab === 'emotes' ? 12 : 20 }, (_, i) =>
          '<span class="hud-spell-slot" aria-label="Unavailable ' + tab +
          ' slot ' + (i + 1) + '">' +
          icon(tab === 'prayer' ? 'star' : tab === 'magic' ? 'sparkle' : 'person') +
          '</span>').join('') + '</div>' + note;
    }
    if (tab === 'combat') {
      return '<div class="hud-combat-title">' + icon('swords') +
        '<span>Combat level: —</span></div><div class="hud-combat-styles">' +
        ['Accurate', 'Aggressive', 'Controlled', 'Defensive'].map((name) =>
          '<span>' + name + '</span>').join('') + '</div>' + note;
    }
    return '<div class="hud-panel-empty">' + icon(
      STONES.find((stone) => stone.id === tab)?.icon ?? 'book',
    ) + '<span>' + (STONES.find((stone) => stone.id === tab)?.name ?? tab) +
      '</span></div>' + note;
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
