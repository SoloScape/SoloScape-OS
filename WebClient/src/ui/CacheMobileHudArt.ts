import type { Js5Client } from '../cache/Js5Client';
import type {
  CacheInterfaceComponent, CacheInterfaceStore,
} from '../cache/CacheInterfaceDefinitions';
import { cacheSpriteCanvas, loadInterfaceSprite } from '../cache/CacheGameUiAssets';
import type { Rev240UiState } from '../protocol/Rev240UiState';

/**
 * Cache-native mobile HUD artwork.
 *
 * The revision-240 mobile root is archive 3:601 (toplevel_osm).
 * It mounts hotkeys 892 at 601:40, minimap/orbs 160 at 601:22 and popout
 * 728 at 601:134. Those mappings are documented by the xrsps reference
 * client (server/src/widgets/viewport/mobile.ts).
 *
 * This draws sprite widgets from those cached definitions. It does NOT copy
 * reference-client PNGs, fake a sprite ID mapping, or take over clicks; the
 * existing interactive hit targets stay in charge until CS2 interactions
 * and dynamic widget placement are implemented.
 */
export const MOBILE_HUD_ROOT = 601;
export const MOBILE_ART_MOUNTS = [
  { childId: 40, groupId: 892 }, // osm_hotkeys
  { childId: 22, groupId: 160 }, // minimap and status orbs
  { childId: 134, groupId: 728 }, // popout
] as const;

type WidgetSet = ReadonlyMap<number, CacheInterfaceComponent>;

function size(raw: number, mode: number, parent: number): number {
  if (mode === 1) return Math.max(0, parent - raw);
  if (mode === 2) return Math.max(0, Math.floor(raw * parent / 16384));
  return Math.max(0, raw);
}

function offset(raw: number, mode: number, parent: number, own: number): number {
  switch (mode) {
    case 1: return raw + Math.floor((parent - own) / 2);
    case 2: return parent - own - raw;
    case 3: return Math.floor(raw * parent / 16384);
    case 4: return Math.floor((parent - own) / 2 + raw * parent / 16384);
    case 5: return Math.floor(parent - own - raw * parent / 16384);
    default: return raw;
  }
}

/**
 * Only small sprites at the edges may be painted over the WebGL scene.
 * A toplevel cache interface contains large, opaque gameframe backgrounds
 * and viewport decorations: painting those as a fullscreen DOM image hides
 * the actual world, even though the sprite is a valid cache asset.
 *
 * This is a safety gate until full widget layout + mobile CS2 is available.
 */
export function isSafeHudOverlaySprite(
  left: number, top: number, width: number, height: number,
  viewportWidth: number, viewportHeight: number,
): boolean {
  if (![left, top, width, height, viewportWidth, viewportHeight]
    .every(Number.isFinite)) return false;
  if (width <= 0 || height <= 0 || viewportWidth <= 0 || viewportHeight <= 0) return false;
  // No fullscreen backgrounds, large strips or stretched panels.
  if (width > Math.min(250, viewportWidth * 0.5) ||
      height > Math.min(230, viewportHeight * 0.4) ||
      width * height > viewportWidth * viewportHeight * 0.09) return false;
  if (left + width <= 0 || top + height <= 0 ||
      left >= viewportWidth || top >= viewportHeight) return false;
  const edgeBand = Math.min(viewportWidth * 0.32, 340);
  return left < edgeBand || left + width > viewportWidth - edgeBand;
}

interface WidgetNode {
  readonly element: HTMLElement;
  readonly component: CacheInterfaceComponent;
  readonly width: number;
  readonly height: number;
}

export class CacheMobileHudArt {
  private readonly spriteUrls = new Map<number, Promise<string | null>>();
  private readonly mountedGroups = new Map<number, WidgetSet>();
  private readonly images = new Set<HTMLImageElement>();
  private readonly shells = new Map<number, WidgetNode>();
  private resizeObserver: ResizeObserver | null = null;
  private serverState: Rev240UiState | null = null;
  private destroyed = false;
  private rendering = false;
  private generation = 0;

  constructor(
    private readonly root: HTMLElement,
    private readonly host: HTMLElement,
    private readonly js5: Js5Client,
    private readonly interfaces: CacheInterfaceStore,
  ) {}

  /**
   * Only opt into the authentic artwork layer when the mobile root actually
   * exists. Missing cache groups leave the usable HTML HUD as a fallback.
   */
  async load(): Promise<boolean> {
    if (!this.interfaces.availableGroupIds.includes(MOBILE_HUD_ROOT)) return false;
    const root = await this.interfaces.load(MOBILE_HUD_ROOT);
    if (this.destroyed) return false;
    this.mountedGroups.set(MOBILE_HUD_ROOT, root);
    await Promise.all(MOBILE_ART_MOUNTS.map(async (mount) => {
      if (!this.interfaces.availableGroupIds.includes(mount.groupId)) return;
      try {
        const group = await this.interfaces.load(mount.groupId);
        if (!this.destroyed) this.mountedGroups.set(mount.groupId, group);
      } catch {
        // A missing optional attachment must not abort root frame artwork.
      }
    }));
    if (this.destroyed) return false;
    // Check actual sprite bytes before hiding the usable fallback shell.
    // The reference cache layout is not assumed to match every rev-240 cache.
    const sample = [...this.mountedGroups.values()]
      .flatMap((widgets) => [...widgets.values()])
      .filter((widget) => !widget.hidden && widget.type === 5 &&
        widget.spriteId !== null)
      .map((widget) => widget.spriteId!)
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, 18);
    if (sample.length < 3) return false;
    const found = await Promise.all(sample.map((id) => this.resolveSprite(id)));
    if (this.destroyed || found.filter((url) => url !== null).length < 3) {
      return false;
    }
    this.host.replaceChildren();
    this.host.classList.add('hud-cache-art');
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => this.render());
    this.resizeObserver.observe(this.root);
    await this.render();
    return true;
  }

  dispose(): void {
    this.destroyed = true;
    this.generation++;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.host.replaceChildren();
    this.root.classList.remove('hud-cache-art-active');
    this.images.clear();
    this.shells.clear();
  }

  setServerState(state: Rev240UiState): void {
    this.serverState = state;
    this.refreshServerVisibility();
  }

  refreshServerVisibility(): void {
    for (const [id, node] of this.shells) {
      node.element.hidden = this.serverState?.widgetChanges.get(id >>> 0)?.hidden ??
        node.component.hidden;
    }
  }

  get visibleSpriteCount(): number {
    return [...this.images].filter((img) => Boolean(img.getAttribute('src'))).length;
  }
  get groups(): readonly number[] { return [...this.mountedGroups.keys()]; }

  private async render(): Promise<void> {
    if (this.destroyed || this.rendering) return;
    const rootGroup = this.mountedGroups.get(MOBILE_HUD_ROOT);
    if (!rootGroup) return;
    this.rendering = true;
    const generation = ++this.generation;
    this.host.replaceChildren();
    this.images.clear();
    this.shells.clear();
    const layer = document.createElement('div');
    layer.className = 'hud-cache-art-stage';
    this.host.append(layer);

    this.layoutGroup(rootGroup, layer, this.root.clientWidth,
      this.root.clientHeight, generation);

    for (const mount of MOBILE_ART_MOUNTS) {
      const group = this.mountedGroups.get(mount.groupId);
      const destination = this.shells.get((MOBILE_HUD_ROOT << 16) | mount.childId);
      if (!group || !destination) continue;
      const mountHost = document.createElement('div');
      mountHost.className = 'hud-cache-art-mount';
      mountHost.style.position = 'absolute';
      mountHost.style.inset = '0';
      destination.element.append(mountHost);
      this.layoutGroup(group, mountHost, destination.width,
        destination.height, generation);
    }

    this.rendering = false;
    this.refreshServerVisibility();
  }

  private layoutGroup(
    components: WidgetSet,
    stage: HTMLElement,
    parentWidth: number,
    parentHeight: number,
    generation: number,
  ): void {
    const byParent = new Map<number, CacheInterfaceComponent[]>();
    const childIds = new Set(components.keys());
    for (const widget of components.values()) {
      const parent = widget.parentId >= 0 &&
        childIds.has(widget.parentId & 0xffff) ? widget.parentId : -1;
      const list = byParent.get(parent) ?? [];
      list.push(widget);
      byParent.set(parent, list);
    }
    const drawn = new Set<number>();
    let spriteLimit = 0;
    const walk = (parent: HTMLElement, parentId: number,
      pw: number, ph: number, depth: number): void => {
      if (depth > 32) return;
      for (const widget of byParent.get(parentId) ?? []) {
        if (drawn.has(widget.id)) continue;
        drawn.add(widget.id);
        const w = size(widget.width, widget.widthAlignment, pw);
        const h = size(widget.height, widget.heightAlignment, ph);
        const el = document.createElement('div');
        el.className = 'hud-cache-art-widget';
        el.dataset.widgetId = String(widget.id >>> 0);
        el.style.position = 'absolute';
        el.style.left = offset(widget.x, widget.xAlignment, pw, w) + 'px';
        el.style.top = offset(widget.y, widget.yAlignment, ph, h) + 'px';
        el.style.width = w + 'px';
        el.style.height = h + 'px';
        parent.append(el);
        el.hidden = this.serverState?.widgetChanges.get(widget.id >>> 0)?.hidden ??
          widget.hidden;
        this.shells.set(widget.id, { element: el, component: widget, width: w, height: h });

        const bounds = el.getBoundingClientRect();
        const viewBounds = this.root.getBoundingClientRect();
        const localLeft = bounds.left - viewBounds.left;
        const localTop = bounds.top - viewBounds.top;
        if (widget.type === 5 && widget.spriteId !== null &&
          spriteLimit < 180 &&
          isSafeHudOverlaySprite(localLeft, localTop, w, h,
            this.root.clientWidth, this.root.clientHeight)) {
          spriteLimit++;
          const image = document.createElement('img');
          image.className = 'hud-cache-art-sprite';
          image.alt = '';
          image.decoding = 'async';
          // Cache sprites can be displaced relative to the old HTML hitbox
          // layout. Consume pointer input over visible HUD art so tapping
          // an icon never falls through into MOVE_GAMECLICK/world movement.
          // We cannot dispatch a tab action without an authenticated widget
          // event mapping / CS2 opcode, so do not guess a handler here.
          image.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            event.stopPropagation();
          });
          image.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
          });
          if (widget.spriteFlipH || widget.spriteFlipV) {
            image.style.transform = [
              widget.spriteFlipH ? 'scaleX(-1)' : '',
              widget.spriteFlipV ? 'scaleY(-1)' : '',
            ].join(' ');
          }
          if (widget.spriteTiling) image.style.objectFit = 'fill';
          el.append(image);
          this.images.add(image);
          void this.resolveSprite(widget.spriteId).then((url) => {
            if (this.destroyed || this.generation !== generation) return;
            if (url) image.src = url;
            else {
              this.images.delete(image);
              image.remove();
            }
          });
        }
        // These parent containers are needed for exact relative cache offsets.
        walk(el, widget.id, w, h, depth + 1);
      }
    };
    walk(stage, -1, parentWidth, parentHeight, 0);
  }

  private resolveSprite(spriteId: number): Promise<string | null> {
    const cached = this.spriteUrls.get(spriteId);
    if (cached) return cached;
    const pending = loadInterfaceSprite(this.js5, spriteId)
      .then((frames) => frames.length
        ? cacheSpriteCanvas(frames[0]!, true).toDataURL('image/png')
        : null)
      .catch(() => null);
    this.spriteUrls.set(spriteId, pending);
    return pending;
  }
}
