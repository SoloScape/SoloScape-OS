import type { CacheSpriteFrame } from '../cache/CacheSpriteDecoder';

const FLAME_WIDTH = 128;
const FLAME_HEIGHT = 256;
const FLAME_PIXEL_COUNT = FLAME_WIDTH * FLAME_HEIGHT;
const FLAME_Y = 8;
const LEFT_FLAME_X = -22;
const RIGHT_FLAME_X = 22 + 765 - FLAME_WIDTH;

/**
 * Browser port of the desktop client's LoginScreenAnimation.
 *
 * The fire itself is procedural, just like OpenOSRS/RuneScape. The only visual
 * masks it consumes are the cache-backed "runes" sprites supplied by archive 8.
 */
export class CacheLoginFlameAnimation {
  private readonly rowOffsets = new Int32Array(FLAME_HEIGHT);
  private readonly redPalette = new Uint32Array(256);
  private readonly greenPalette = new Uint32Array(256);
  private readonly bluePalette = new Uint32Array(256);
  private readonly activePalette = new Uint32Array(256);
  private noise = new Int32Array(FLAME_PIXEL_COUNT);
  private noiseScratch = new Int32Array(FLAME_PIXEL_COUNT);
  private readonly intensity = new Int32Array(FLAME_PIXEL_COUNT);
  private readonly blurScratch = new Int32Array(FLAME_PIXEL_COUNT);
  private readonly flameCanvas: HTMLCanvasElement;
  private readonly flameContext: CanvasRenderingContext2D;
  private readonly flameImage: ImageData;

  private noiseOffset = 0;
  private sineCursor = 0;
  private greenFlash = 0;
  private blueFlash = 0;
  private sparkAccumulator = 0;
  private lastTick: number | null = null;

  constructor(
    private readonly runeMasks: readonly CacheSpriteFrame[],
    private readonly random: () => number = Math.random,
  ) {
    if (runeMasks.length === 0) {
      throw new Error(
        'Cache login flame animation requires at least one rune mask.',
      );
    }

    this.initPalettes();
    this.seedNoise(null);

    this.flameCanvas = document.createElement('canvas');
    this.flameCanvas.width = FLAME_WIDTH;
    this.flameCanvas.height = FLAME_HEIGHT;

    const context = this.flameCanvas.getContext('2d');
    if (!context) {
      throw new Error('2D canvas is unavailable for login flames.');
    }

    this.flameContext = context;
    this.flameImage = context.createImageData(
      FLAME_WIDTH,
      FLAME_HEIGHT,
    );
  }

  draw(
    target: CanvasRenderingContext2D,
    timestampMs: number,
  ): void {
    const tick = Math.floor(timestampMs / 20);

    if (this.lastTick === null) {
      this.lastTick = tick;
    }

    let delta = tick - this.lastTick;
    if (delta < 0 || delta >= FLAME_HEIGHT) {
      delta = 0;
    }
    this.lastTick = tick;

    if (delta > 0) {
      this.advance(delta, tick);
    }

    this.updatePalette();
    this.composeFrame();

    target.drawImage(
      this.flameCanvas,
      LEFT_FLAME_X,
      FLAME_Y,
    );
    target.drawImage(
      this.flameCanvas,
      RIGHT_FLAME_X,
      FLAME_Y,
    );
  }

  private initPalettes(): void {
    for (let i = 0; i < 64; i += 1) {
      this.redPalette[i] = i * 0x040000;
      this.redPalette[i + 64] = 0xff0000 + i * 0x000400;
      this.redPalette[i + 128] = 0xffff00 + i * 0x000004;
      this.redPalette[i + 192] = 0xffffff;

      this.greenPalette[i] = i * 0x000400;
      this.greenPalette[i + 64] = 0x00ff00 + i * 0x000004;
      this.greenPalette[i + 128] = 0x00ffff + i * 0x040000;
      this.greenPalette[i + 192] = 0xffffff;

      this.bluePalette[i] = i * 0x000004;
      this.bluePalette[i + 64] = 0x0000ff + i * 0x040000;
      this.bluePalette[i + 128] = 0xff00ff + i * 0x000400;
      this.bluePalette[i + 192] = 0xffffff;
    }

    this.activePalette.set(this.redPalette);
  }

  private advance(delta: number, tick: number): void {
    this.noiseOffset += delta * FLAME_WIDTH;

    if (this.noiseOffset >= FLAME_PIXEL_COUNT) {
      this.noiseOffset %= FLAME_PIXEL_COUNT;
      const mask = this.runeMasks[
        Math.floor(this.random() * this.runeMasks.length)
      ]!;
      this.seedNoise(mask);
    }

    const sourceOffset = delta * FLAME_WIDTH;
    const retainedPixels =
      (FLAME_HEIGHT - delta) * FLAME_WIDTH;

    for (let index = 0; index < retainedPixels; index += 1) {
      const noise =
        this.noise[
          (index + this.noiseOffset) &
            (FLAME_PIXEL_COUNT - 1)
        ]!;
      const value =
        this.intensity[index + sourceOffset]! -
        Math.floor(noise * delta / 6);
      this.intensity[index] = Math.max(0, value);
    }

    const sideMargin = 10;
    const rightLimit = FLAME_WIDTH - sideMargin;

    for (
      let y = FLAME_HEIGHT - delta;
      y < FLAME_HEIGHT;
      y += 1
    ) {
      const row = y * FLAME_WIDTH;
      for (let x = 0; x < FLAME_WIDTH; x += 1) {
        this.intensity[row + x] =
          this.random() < 0.5 &&
          x > sideMargin &&
          x < rightLimit
            ? 255
            : 0;
      }
    }

    this.greenFlash = Math.max(
      0,
      this.greenFlash - delta * 4,
    );
    this.blueFlash = Math.max(
      0,
      this.blueFlash - delta * 4,
    );

    if (this.greenFlash === 0 && this.blueFlash === 0) {
      const bound = Math.max(
        1,
        Math.floor(2000 / delta),
      );
      const roll = Math.floor(this.random() * bound);
      if (roll === 0) {
        this.greenFlash = 1024;
      } else if (roll === 1) {
        this.blueFlash = 1024;
      }
    }

    for (
      let row = 0;
      row < FLAME_HEIGHT - delta;
      row += 1
    ) {
      this.rowOffsets[row] =
        this.rowOffsets[row + delta]!;
    }

    for (
      let row = FLAME_HEIGHT - delta;
      row < FLAME_HEIGHT;
      row += 1
    ) {
      this.rowOffsets[row] = Math.floor(
        Math.sin(this.sineCursor / 14) * 16 +
        Math.sin(this.sineCursor / 15) * 14 +
        Math.sin(this.sineCursor / 16) * 12,
      );
      this.sineCursor += 1;
    }

    this.sparkAccumulator += delta;
    const blurRadius = Math.floor(
      ((tick & 1) + delta) / 2,
    );

    if (blurRadius <= 0) {
      return;
    }

    const sparkMinX = 2;
    const sparkWidth = FLAME_WIDTH - 4;

    for (
      let spark = 0;
      spark < this.sparkAccumulator * 100;
      spark += 1
    ) {
      const x =
        Math.floor(this.random() * sparkWidth) +
        sparkMinX;
      const y =
        Math.floor(this.random() * 128) + 128;
      this.intensity[y * FLAME_WIDTH + x] = 192;
    }
    this.sparkAccumulator = 0;

    this.blur(blurRadius);
  }

  private blur(radius: number): void {
    const divisor = radius * 2 + 1;

    for (let y = 0; y < FLAME_HEIGHT; y += 1) {
      let sum = 0;
      const row = y * FLAME_WIDTH;

      for (
        let x = -radius;
        x < FLAME_WIDTH;
        x += 1
      ) {
        const addX = x + radius;
        if (addX < FLAME_WIDTH) {
          sum += this.intensity[row + addX]!;
        }

        const removeX = x - (radius + 1);
        if (removeX >= 0) {
          sum -= this.intensity[row + removeX]!;
        }

        if (x >= 0) {
          this.blurScratch[row + x] =
            Math.floor(sum / divisor);
        }
      }
    }

    for (let x = 0; x < FLAME_WIDTH; x += 1) {
      let sum = 0;

      for (
        let y = -radius;
        y < FLAME_HEIGHT;
        y += 1
      ) {
        const addY = y + radius;
        if (addY < FLAME_HEIGHT) {
          sum +=
            this.blurScratch[
              addY * FLAME_WIDTH + x
            ]!;
        }

        const removeY = y - (radius + 1);
        if (removeY >= 0) {
          sum -=
            this.blurScratch[
              removeY * FLAME_WIDTH + x
            ]!;
        }

        if (y >= 0) {
          this.intensity[y * FLAME_WIDTH + x] =
            Math.floor(sum / divisor);
        }
      }
    }
  }

  private updatePalette(): void {
    if (this.greenFlash > 0) {
      this.blendPalette(
        this.greenFlash,
        this.greenPalette,
      );
      return;
    }

    if (this.blueFlash > 0) {
      this.blendPalette(
        this.blueFlash,
        this.bluePalette,
      );
      return;
    }

    this.activePalette.set(this.redPalette);
  }

  private blendPalette(
    amount: number,
    alternate: Uint32Array,
  ): void {
    for (let index = 0; index < 256; index += 1) {
      if (amount > 768) {
        this.activePalette[index] = blendRgb(
          this.redPalette[index]!,
          alternate[index]!,
          1024 - amount,
        );
      } else if (amount > 256) {
        this.activePalette[index] = alternate[index]!;
      } else {
        this.activePalette[index] = blendRgb(
          alternate[index]!,
          this.redPalette[index]!,
          256 - amount,
        );
      }
    }
  }

  private composeFrame(): void {
    const rgba = this.flameImage.data;
    rgba.fill(0);

    for (let y = 1; y < FLAME_HEIGHT - 1; y += 1) {
      const shift = Math.floor(
        (FLAME_HEIGHT - y) *
          this.rowOffsets[y]! /
          FLAME_HEIGHT,
      );
      const row = y * FLAME_WIDTH;

      for (let x = 0; x < FLAME_WIDTH; x += 1) {
        const strength = this.intensity[row + x]!;
        if (strength === 0) {
          continue;
        }

        const drawX = x + shift;
        if (drawX < 0 || drawX >= FLAME_WIDTH) {
          continue;
        }

        const rgb = this.activePalette[strength]!;
        const output =
          (row + drawX) * 4;

        rgba[output] = (rgb >>> 16) & 0xff;
        rgba[output + 1] = (rgb >>> 8) & 0xff;
        rgba[output + 2] = rgb & 0xff;
        rgba[output + 3] = strength;
      }
    }

    this.flameContext.putImageData(
      this.flameImage,
      0,
      0,
    );
  }

  private seedNoise(mask: CacheSpriteFrame | null): void {
    this.noise.fill(0);

    for (let index = 0; index < 5000; index += 1) {
      const pixel = Math.floor(
        this.random() * FLAME_PIXEL_COUNT,
      );
      this.noise[pixel] = Math.floor(
        this.random() * 256,
      );
    }

    for (let pass = 0; pass < 20; pass += 1) {
      for (let y = 1; y < FLAME_HEIGHT - 1; y += 1) {
        for (let x = 1; x < FLAME_WIDTH - 1; x += 1) {
          const index = y * FLAME_WIDTH + x;
          this.noiseScratch[index] = Math.floor(
            (
              this.noise[index - FLAME_WIDTH]! +
              this.noise[index + 1]! +
              this.noise[index + FLAME_WIDTH]! +
              this.noise[index - 1]!
            ) / 4,
          );
        }
      }

      const swap = this.noise;
      this.noise = this.noiseScratch;
      this.noiseScratch = swap;
    }

    if (!mask) {
      return;
    }

    let source = 0;
    for (let y = 0; y < mask.height; y += 1) {
      for (let x = 0; x < mask.width; x += 1) {
        if (mask.indices[source++] === 0) {
          continue;
        }

        const targetX = x + mask.xOffset + 16;
        const targetY = y + mask.yOffset + 16;

        if (
          targetX >= 0 &&
          targetX < FLAME_WIDTH &&
          targetY >= 0 &&
          targetY < FLAME_HEIGHT
        ) {
          this.noise[
            targetY * FLAME_WIDTH + targetX
          ] = 0;
        }
      }
    }
  }
}

function blendRgb(
  from: number,
  to: number,
  alpha: number,
): number {
  const clamped = Math.max(0, Math.min(256, alpha));
  const inverse = 256 - clamped;

  const red =
    (((from >>> 16) & 0xff) * inverse +
      ((to >>> 16) & 0xff) * clamped) >>> 8;
  const green =
    (((from >>> 8) & 0xff) * inverse +
      ((to >>> 8) & 0xff) * clamped) >>> 8;
  const blue =
    ((from & 0xff) * inverse +
      (to & 0xff) * clamped) >>> 8;

  return (red << 16) | (green << 8) | blue;
}
