import type { CacheFontAsset } from '../cache/TitleScreenAssets';
import type { CacheSpriteFrame } from '../cache/CacheSpriteDecoder';

export type TextAlign = 'left' | 'center' | 'right';

export class CacheBitmapFont {
  private readonly advances: Uint8Array;
  private readonly ascent: number;
  private readonly glyphCanvases = new Map<string, HTMLCanvasElement>();

  constructor(private readonly asset: CacheFontAsset) {
    if (asset.glyphs.length < 256) {
      throw new Error(
        'Cache font ' + asset.name + ' has ' + asset.glyphs.length +
          ' glyphs; expected at least 256.',
      );
    }
    if (asset.metrics.length < 256) {
      throw new Error(
        'Cache font ' + asset.name + ' metrics are too short: ' +
          asset.metrics.length + ' bytes.',
      );
    }

    this.advances = asset.metrics.slice(0, 256);
    this.ascent = asset.metrics.length === 257
      ? asset.metrics[256]!
      : Math.max(
          1,
          ...asset.glyphs.slice(0, 256).map(
            (glyph) => glyph.sheetHeight,
          ),
        );
  }

  measure(text: string): number {
    let width = 0;
    for (const char of text) {
      width += this.advances[toCp1252(char)]!;
    }
    return width;
  }

  draw(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    baselineY: number,
    rgb: number,
    align: TextAlign = 'left',
    shadow = true,
  ): void {
    let drawX = x;
    const width = this.measure(text);

    if (align === 'center') {
      drawX -= Math.floor(width / 2);
    } else if (align === 'right') {
      drawX -= width;
    }

    for (const char of text) {
      const code = toCp1252(char);
      const glyph = this.asset.glyphs[code]!;
      const advance = this.advances[code]!;

      if (glyph.width > 0 && glyph.height > 0) {
        if (shadow) {
          this.drawGlyph(
            context,
            glyph,
            code,
            drawX + 1,
            baselineY + 1,
            0x000000,
          );
        }
        this.drawGlyph(
          context,
          glyph,
          code,
          drawX,
          baselineY,
          rgb,
        );
      }

      drawX += advance;
    }
  }

  fitTail(text: string, maxWidth: number): string {
    let value = text;
    while (value.length > 0 && this.measure(value) > maxWidth) {
      value = value.slice(1);
    }
    return value;
  }

  private drawGlyph(
    context: CanvasRenderingContext2D,
    glyph: CacheSpriteFrame,
    code: number,
    x: number,
    baselineY: number,
    rgb: number,
  ): void {
    const canvas = this.getGlyphCanvas(glyph, code, rgb);
    context.drawImage(
      canvas,
      x + glyph.xOffset,
      baselineY - this.ascent + glyph.yOffset,
    );
  }

  private getGlyphCanvas(
    glyph: CacheSpriteFrame,
    code: number,
    rgb: number,
  ): HTMLCanvasElement {
    const key = code + ':' + rgb;
    const cached = this.glyphCanvases.get(key);
    if (cached) {
      return cached;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, glyph.width);
    canvas.height = Math.max(1, glyph.height);
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('2D canvas is unavailable for cache font rendering.');
    }

    const image = context.createImageData(glyph.width, glyph.height);
    const red = (rgb >>> 16) & 0xff;
    const green = (rgb >>> 8) & 0xff;
    const blue = rgb & 0xff;

    for (let pixel = 0; pixel < glyph.indices.length; pixel += 1) {
      const paletteIndex = glyph.indices[pixel]!;
      const alpha = glyph.alpha
        ? glyph.alpha[pixel]!
        : paletteIndex === 0
          ? 0
          : 0xff;
      const output = pixel * 4;
      image.data[output] = red;
      image.data[output + 1] = green;
      image.data[output + 2] = blue;
      image.data[output + 3] = alpha;
    }

    context.putImageData(image, 0, 0);
    this.glyphCanvases.set(key, canvas);
    return canvas;
  }
}

function toCp1252(char: string): number {
  const code = char.charCodeAt(0);
  if (code >= 0 && code <= 255) {
    return code;
  }
  return 63;
}
