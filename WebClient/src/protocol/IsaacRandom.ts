/**
 * ISAAC stream cipher used by the OSRS game protocol.
 *
 * Ported from the rev-240 rsprot/OpenRS2 implementation used by SoloScape.
 * Every arithmetic operation is intentionally wrapped to signed 32-bit integer
 * semantics to match Kotlin/Java Int overflow.
 */
export class IsaacRandom {
  private static readonly SIZE = 256;
  private static readonly MASK = (IsaacRandom.SIZE - 1) << 2;
  private static readonly GOLDEN_RATIO = 0x9e3779b9 | 0;

  private count = 0;
  private readonly results = new Int32Array(IsaacRandom.SIZE);
  private readonly memory = new Int32Array(IsaacRandom.SIZE);
  private a = 0;
  private b = 0;
  private c = 0;

  constructor(seed: readonly number[] = []) {
    if (seed.length > IsaacRandom.SIZE) {
      throw new RangeError('ISAAC seed may contain at most 256 integers.');
    }

    for (let i = 0; i < seed.length; i += 1) {
      this.results[i] = seed[i] | 0;
    }

    this.initialize(seed.length !== 0);
  }

  nextInt(): number {
    if (this.count-- === 0) {
      this.isaac();
      this.count = IsaacRandom.SIZE - 1;
    }

    return this.results[this.count] | 0;
  }

  private initialize(useSeed: boolean): void {
    let a = IsaacRandom.GOLDEN_RATIO;
    let b = IsaacRandom.GOLDEN_RATIO;
    let c = IsaacRandom.GOLDEN_RATIO;
    let d = IsaacRandom.GOLDEN_RATIO;
    let e = IsaacRandom.GOLDEN_RATIO;
    let f = IsaacRandom.GOLDEN_RATIO;
    let g = IsaacRandom.GOLDEN_RATIO;
    let h = IsaacRandom.GOLDEN_RATIO;

    const mix = (): void => {
      a = (a ^ (b << 11)) | 0;
      d = (d + a) | 0;
      b = (b + c) | 0;

      b = (b ^ (c >>> 2)) | 0;
      e = (e + b) | 0;
      c = (c + d) | 0;

      c = (c ^ (d << 8)) | 0;
      f = (f + c) | 0;
      d = (d + e) | 0;

      d = (d ^ (e >>> 16)) | 0;
      g = (g + d) | 0;
      e = (e + f) | 0;

      e = (e ^ (f << 10)) | 0;
      h = (h + e) | 0;
      f = (f + g) | 0;

      f = (f ^ (g >>> 4)) | 0;
      a = (a + f) | 0;
      g = (g + h) | 0;

      g = (g ^ (h << 8)) | 0;
      b = (b + g) | 0;
      h = (h + a) | 0;

      h = (h ^ (a >>> 9)) | 0;
      c = (c + h) | 0;
      a = (a + b) | 0;
    };

    for (let i = 0; i < 4; i += 1) {
      mix();
    }

    for (let i = 0; i < IsaacRandom.SIZE; i += 8) {
      if (useSeed) {
        a = (a + this.results[i]) | 0;
        b = (b + this.results[i + 1]) | 0;
        c = (c + this.results[i + 2]) | 0;
        d = (d + this.results[i + 3]) | 0;
        e = (e + this.results[i + 4]) | 0;
        f = (f + this.results[i + 5]) | 0;
        g = (g + this.results[i + 6]) | 0;
        h = (h + this.results[i + 7]) | 0;
      }

      mix();
      this.memory.set([a, b, c, d, e, f, g, h], i);
    }

    if (useSeed) {
      for (let i = 0; i < IsaacRandom.SIZE; i += 8) {
        a = (a + this.memory[i]) | 0;
        b = (b + this.memory[i + 1]) | 0;
        c = (c + this.memory[i + 2]) | 0;
        d = (d + this.memory[i + 3]) | 0;
        e = (e + this.memory[i + 4]) | 0;
        f = (f + this.memory[i + 5]) | 0;
        g = (g + this.memory[i + 6]) | 0;
        h = (h + this.memory[i + 7]) | 0;

        mix();
        this.memory.set([a, b, c, d, e, f, g, h], i);
      }
    }

    this.a = 0;
    this.b = 0;
    this.c = 0;
    this.isaac();
    this.count = IsaacRandom.SIZE;
  }

  private isaac(): void {
    let a = this.a | 0;
    this.c = (this.c + 1) | 0;
    let b = (this.b + this.c) | 0;

    let i = 0;
    let j = IsaacRandom.SIZE >>> 1;

    const step = (shiftMode: number): void => {
      const x = this.memory[i] | 0;

      switch (shiftMode) {
        case 0:
          a = (a ^ (a << 13)) | 0;
          break;
        case 1:
          a = (a ^ (a >>> 6)) | 0;
          break;
        case 2:
          a = (a ^ (a << 2)) | 0;
          break;
        default:
          a = (a ^ (a >>> 16)) | 0;
          break;
      }

      a = (a + this.memory[j++]) | 0;
      const y = (
        this.memory[(x & IsaacRandom.MASK) >>> 2] + a + b
      ) | 0;
      this.memory[i] = y;
      b = (
        this.memory[((y >>> 8) & IsaacRandom.MASK) >>> 2] + x
      ) | 0;
      this.results[i] = b;
      i += 1;
    };

    while (i < (IsaacRandom.SIZE >>> 1)) {
      step(0);
      step(1);
      step(2);
      step(3);
    }

    j = 0;
    while (i < IsaacRandom.SIZE) {
      step(0);
      step(1);
      step(2);
      step(3);
    }

    this.a = a;
    this.b = b;
  }
}
