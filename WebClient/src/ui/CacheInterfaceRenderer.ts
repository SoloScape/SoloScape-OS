import type { Js5Client } from '../cache/Js5Client';
import {
  type CacheInterfaceComponent,
  type CacheInterfaceStore,
} from '../cache/CacheInterfaceDefinitions';
import {
  cacheSpriteCanvas, loadInterfaceFont, loadInterfaceSprite,
} from '../cache/CacheGameUiAssets';
import type { CacheFontAsset } from '../cache/TitleScreenAssets';
import { CacheBitmapFont } from './CacheBitmapFont';

/**
 * Render original JS5 archive-3 widget geometry. The mobile side-panel
 * container is responsive, but its contents come from cache components.
 * No placeholder inventory/equipment/prayer/skills layouts are fabricated.
 */
export class CacheInterfaceRenderer {
  private readonly spritePromises = new Map<number, Promise<string | null>>();
  private readonly fontPromises = new Map<number, Promise<CacheBitmapFont>>();
  private readonly defaultFont: CacheBitmapFont;
  private observer: ResizeObserver | null = null;
  private generation = 0;

  constructor(
    private readonly js5: Js5Client,
    private readonly interfaces: CacheInterfaceStore,
    defaultFont: CacheFontAsset,
  ) {
    this.defaultFont = new CacheBitmapFont(defaultFont);
  }

  cancel(): void {
    this.generation++;
    this.observer?.disconnect();
    this.observer = null;
  }

  async show(groupId: number, host: HTMLElement): Promise<void> {
    this.cancel();
    const generation = this.generation;
    host.replaceChildren();
    host.textContent = 'Loading cache interface ' + groupId + '...';
    try {
      const components = await this.interfaces.load(groupId);
      if (generation !== this.generation) return;
      host.replaceChildren();
      if (!components.size) {
        host.textContent = 'The cache interface contains no widgets.';
        return;
      }
      this.drawGroup(groupId, components, host, generation);
    } catch (error: unknown) {
      if (generation !== this.generation) return;
      host.textContent = 'Cache interface ' + groupId + ' unavailable: ' +
        (error instanceof Error ? error.message : String(error));
    }
  }

  private drawGroup(
    groupId: number,
    components: ReadonlyMap<number, CacheInterfaceComponent>,
    host: HTMLElement,
    generation: number,
  ): void {
    const viewport = document.createElement('div');
    viewport.className = 'cache-interface-viewport';
    viewport.setAttribute('aria-label', 'Cache interface ' + groupId);
    const stage = document.createElement('div');
    stage.className = 'cache-interface-stage';
    viewport.append(stage);
    host.append(viewport);

    const all = Array.from(components.values());
    const roots = all.filter((component) =>
      component.parentId === -1 || !components.has(component.parentId & 0xffff));
    const baseWidth = Math.max(190, ...roots.map((root) =>
      Math.max(0, root.x) + Math.max(0, root.width)));
    const baseHeight = Math.max(261, ...roots.map((root) =>
      Math.max(0, root.y) + Math.max(0, root.height)));
    stage.style.width = baseWidth + 'px';
    stage.style.height = baseHeight + 'px';

    const children = new Map<number, CacheInterfaceComponent[]>();
    for (const component of all) {
      if (component.hidden) continue;
      const parent = component.parentId;
      const groupChildren = children.get(parent) ?? [];
      groupChildren.push(component);
      children.set(parent, groupChildren);
    }

    const visited = new Set<number>();
    const build = (widget: CacheInterfaceComponent, parent: HTMLElement,
      parentWidth: number, parentHeight: number, depth: number): void => {
      if (depth > 64 || visited.has(widget.id)) return;
      visited.add(widget.id);
      const element = document.createElement('div');
      element.className = 'cache-widget cache-widget-type-' + widget.type;
      element.dataset.widgetId = String(widget.id >>> 0);
      element.setAttribute('aria-label', 'Cache widget ' + widget.groupId +
        ':' + widget.childId);

      const width = alignedDimension(widget.width, widget.widthAlignment, parentWidth);
      const height = alignedDimension(widget.height, widget.heightAlignment, parentHeight);
      element.style.left = alignedOffset(widget.x, widget.xAlignment,
        parentWidth, width) + 'px';
      element.style.top = alignedOffset(widget.y, widget.yAlignment,
        parentHeight, height) + 'px';
      element.style.width = Math.max(0, width) + 'px';
      element.style.height = Math.max(0, height) + 'px';
      if (widget.opacity) element.style.opacity = String((255 - widget.opacity) / 255);

      switch (widget.type) {
        case 0:
          if (widget.scrollHeight > height || widget.scrollWidth > width) {
            element.style.overflow = 'auto';
          } else {
            element.style.overflow = 'hidden';
          }
          break;
        case 2: {
          // IF1 type-2 is an inventory container. The cache defines its
          // dimensions and spacing; item contents come from server packets.
          element.classList.add('cache-widget-items');
          element.style.setProperty('--item-columns', String(Math.max(1, widget.width)));
          element.style.setProperty('--item-spacing-x', widget.gridPaddingX + 'px');
          element.style.setProperty('--item-spacing-y', widget.gridPaddingY + 'px');
          const slots = Math.min(2000, widget.width * widget.height);
          element.style.width = (widget.width * 32 +
            Math.max(0, widget.width - 1) * widget.gridPaddingX) + 'px';
          element.style.height = (widget.height * 32 +
            Math.max(0, widget.height - 1) * widget.gridPaddingY) + 'px';
          for (let slot = 0; slot < slots; slot++) {
            const cell = document.createElement('div');
            cell.className = 'cache-widget-item';
            cell.dataset.slot = String(slot);
            cell.setAttribute('aria-label', 'Item slot ' + (slot + 1) +
              ', awaiting server data');
            element.append(cell);
          }
          break;
        }
        case 3:
          if (widget.colour !== null) {
            const colour = cssColour(widget.colour);
            element.style.backgroundColor = widget.filled ? colour : 'transparent';
            if (!widget.filled) element.style.border = '1px solid ' + colour;
          }
          break;
        case 4:
          if (widget.text) void this.drawText(widget, element, generation);
          break;
        case 5:
          if (widget.spriteId !== null) {
            void this.drawSprite(widget, element, generation);
          }
          break;
        case 9:
          if (widget.colour !== null) {
            element.style.borderTop = '1px solid ' + cssColour(widget.colour);
            element.style.transformOrigin = 'top left';
            element.style.transform = 'rotate(' +
              Math.atan2(height, width) + 'rad)';
          }
          break;
      }
      parent.append(element);
      for (const child of children.get(widget.id) ?? []) {
        build(child, element, width, height, depth + 1);
      }
    };
    for (const root of roots) {
      if (!root.hidden) build(root, stage, baseWidth, baseHeight, 0);
    }
    // Detached components in a malformed cache group are not silently lost.
    for (const widget of all) {
      if (!widget.hidden && !visited.has(widget.id)) {
        build(widget, stage, baseWidth, baseHeight, 0);
      }
    }

    const resize = (): void => {
      if (generation !== this.generation) {
        observer.disconnect();
        return;
      }
      const width = Math.max(1, viewport.clientWidth);
      const scale = Math.min(2, width / baseWidth);
      stage.style.transform = 'scale(' + scale + ')';
      viewport.style.minHeight = Math.ceil(baseHeight * scale) + 'px';
    };
    const observer = new ResizeObserver(resize);
    this.observer = observer;
    observer.observe(viewport);
    resize();
  }

  private async drawSprite(
    widget: CacheInterfaceComponent, host: HTMLElement, generation: number,
  ): Promise<void> {
    const id = widget.spriteId!;
    let promise = this.spritePromises.get(id);
    if (!promise) {
      promise = loadInterfaceSprite(this.js5, id)
        .then((frames) => frames.length ?
          cacheSpriteCanvas(frames[0]!).toDataURL('image/png') : null)
        .catch(() => null);
      this.spritePromises.set(id, promise);
    }
    const url = await promise;
    if (generation !== this.generation || !url || !host.isConnected) return;
    const image = document.createElement('img');
    image.className = 'cache-widget-sprite';
    image.alt = '';
    image.src = url;
    image.style.transform =
      (widget.spriteFlipH ? 'scaleX(-1) ' : '') +
      (widget.spriteFlipV ? 'scaleY(-1) ' : '') +
      (widget.spriteAngle ? 'rotate(' + (widget.spriteAngle * 360 / 2048) + 'deg)' : '');
    if (widget.spriteTiling) image.style.objectFit = 'fill';
    host.prepend(image);
  }

  private async drawText(
    widget: CacheInterfaceComponent, host: HTMLElement, generation: number,
  ): Promise<void> {
    let font = this.defaultFont;
    if (widget.fontId !== null) {
      let promise = this.fontPromises.get(widget.fontId);
      if (!promise) {
        promise = loadInterfaceFont(this.js5, widget.fontId)
          .then((asset) => new CacheBitmapFont(asset));
        this.fontPromises.set(widget.fontId, promise);
      }
      try { font = await promise; }
      catch {
        // Unavailable variant: continue with genuine cached b12 glyphs.
        this.fontPromises.delete(widget.fontId);
      }
    }
    if (generation !== this.generation || !host.isConnected) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'cache-widget-text';
    const width = Math.max(1, widget.width);
    const height = Math.max(1, widget.height);
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;
    // Cache text markup is not HTML. Strip tags before drawing; markup
    // colours/variables are later work, and must never become DOM HTML.
    const label = (widget.text ?? '').replace(/<[^>]*>/g, '');
    const align = widget.textXAlignment === 1 ? 'center' :
      widget.textXAlignment === 2 ? 'right' : 'left';
    const x = align === 'center' ? width / 2 : align === 'right' ? width : 0;
    const y = widget.textYAlignment === 1 ? height / 2 + 5 :
      widget.textYAlignment === 2 ? Math.max(12, height - 2) : 15;
    font.draw(context, label, x, y, widget.colour ?? 0xffffff, align,
      widget.textShadow);
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
    host.prepend(canvas);
  }
}

function cssColour(value: number): string {
  return '#' + (value & 0xffffff).toString(16).padStart(6, '0');
}

function alignedDimension(raw: number, alignment: number, parent: number): number {
  if (alignment === 1) return parent - raw;
  if (alignment === 2) return Math.floor(parent * raw / 16384);
  return raw;
}

function alignedOffset(raw: number, alignment: number,
  parent: number, size: number): number {
  if (alignment === 1) return raw + Math.floor((parent - size) / 2);
  if (alignment === 2) return parent - size - raw;
  if (alignment === 3) return Math.floor(raw * parent / 16384);
  if (alignment === 4) return Math.floor((parent - size) / 2 +
    raw * parent / 16384);
  if (alignment === 5) return Math.floor(parent - size -
    raw * parent / 16384);
  return raw;
}
