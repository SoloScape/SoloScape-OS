import {
  cacheSpriteToRgba,
  type CacheSpriteFrame,
} from '../cache/CacheSpriteDecoder';
import type { TitleScreenAssets } from '../cache/TitleScreenAssets';
import { CacheBitmapFont } from './CacheBitmapFont';

const VIEWPORT_WIDTH = 765;
const VIEWPORT_HEIGHT = 503;
const LOGIN_CENTER_X = 382;
const TITLE_BOX_Y = 171;
const USERNAME_BASELINE_Y = 253;
const PASSWORD_BASELINE_Y = 268;
const BUTTON_CENTER_Y = 321;
const BUTTON_CENTER_OFFSET = 80;
const WHITE = 0xffffff;
const YELLOW = 0xffff00;

export type LoginField = 'username' | 'password';
export type TitleHitTarget =
  | LoginField
  | 'login'
  | 'cancel'
  | null;

export interface LoginRenderState {
  readonly username: string;
  readonly password: string;
  readonly selectedField: LoginField;
  readonly message?: string;
  readonly showCursor?: boolean;
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

type CacheImageSource = ImageBitmap | HTMLImageElement;

export class CacheTitleScreenRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly plain12: CacheBitmapFont;
  private readonly bold12: CacheBitmapFont;
  private readonly logoCanvas: HTMLCanvasElement;
  private readonly titleBoxCanvas: HTMLCanvasElement;
  private readonly titleButtonCanvas: HTMLCanvasElement;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly background: CacheImageSource,
    private readonly assets: TitleScreenAssets,
  ) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('2D canvas is unavailable for the title screen.');
    }

    this.context = context;
    this.plain12 = new CacheBitmapFont(assets.plain12);
    this.bold12 = new CacheBitmapFont(assets.bold12);
    this.logoCanvas = createSpriteCanvas(assets.logo);
    this.titleBoxCanvas = createSpriteCanvas(assets.titleBox);
    this.titleButtonCanvas = createSpriteCanvas(assets.titleButton);
  }

  static async create(
    canvas: HTMLCanvasElement,
    assets: TitleScreenAssets,
  ): Promise<CacheTitleScreenRenderer> {
    const background = await decodeCacheJpeg(assets.backgroundJpeg);
    return new CacheTitleScreenRenderer(canvas, background, assets);
  }

  renderLogin(state: LoginRenderState): void {
    this.drawBase();
    this.drawSpriteCentered(
      this.titleBoxCanvas,
      this.assets.titleBox,
      LOGIN_CENTER_X,
      TITLE_BOX_Y,
    );

    this.bold12.draw(
      this.context,
      state.message ?? 'Enter your username/email & password.',
      LOGIN_CENTER_X,
      201,
      YELLOW,
      'center',
    );

    const cursor = state.showCursor === false ? '' : '|';
    const usernameCursor =
      state.selectedField === 'username' ? cursor : '';
    const passwordCursor =
      state.selectedField === 'password' ? cursor : '';

    const username = this.plain12.fitTail(
      state.username + usernameCursor,
      170,
    );
    const password = this.plain12.fitTail(
      '*'.repeat(state.password.length) + passwordCursor,
      170,
    );

    this.plain12.draw(
      this.context,
      'Login: ',
      LOGIN_CENTER_X - 110,
      USERNAME_BASELINE_Y,
      WHITE,
    );
    this.plain12.draw(
      this.context,
      username,
      LOGIN_CENTER_X - 70,
      USERNAME_BASELINE_Y,
      WHITE,
    );
    this.plain12.draw(
      this.context,
      'Password: ',
      LOGIN_CENTER_X - 110,
      PASSWORD_BASELINE_Y,
      WHITE,
    );
    this.plain12.draw(
      this.context,
      password,
      LOGIN_CENTER_X - 54,
      PASSWORD_BASELINE_Y,
      WHITE,
    );

    const login = this.buttonRect(-BUTTON_CENTER_OFFSET);
    const cancel = this.buttonRect(BUTTON_CENTER_OFFSET);
    this.drawButton(login, 'Login');
    this.drawButton(cancel, 'Cancel');
  }

  renderMessage(message: string, detail?: string): void {
    this.drawBase();
    this.drawSpriteCentered(
      this.titleBoxCanvas,
      this.assets.titleBox,
      LOGIN_CENTER_X,
      TITLE_BOX_Y,
    );
    this.bold12.draw(
      this.context,
      message,
      LOGIN_CENTER_X,
      245,
      YELLOW,
      'center',
    );
    if (detail) {
      this.plain12.draw(
        this.context,
        detail,
        LOGIN_CENTER_X,
        265,
        WHITE,
        'center',
      );
    }
  }

  hitTest(x: number, y: number): TitleHitTarget {
    if (contains(this.usernameRect(), x, y)) {
      return 'username';
    }
    if (contains(this.passwordRect(), x, y)) {
      return 'password';
    }
    if (contains(this.buttonRect(-BUTTON_CENTER_OFFSET), x, y)) {
      return 'login';
    }
    if (contains(this.buttonRect(BUTTON_CENTER_OFFSET), x, y)) {
      return 'cancel';
    }
    return null;
  }

  private drawBase(): void {
    const context = this.context;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.imageSmoothingEnabled = false;
    context.fillStyle = '#000';
    context.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    const width = imageWidth(this.background);
    const height = imageHeight(this.background);

    if (width >= VIEWPORT_WIDTH) {
      context.drawImage(
        this.background,
        0,
        0,
        Math.min(width, VIEWPORT_WIDTH),
        Math.min(height, VIEWPORT_HEIGHT),
        0,
        0,
        Math.min(width, VIEWPORT_WIDTH),
        Math.min(height, VIEWPORT_HEIGHT),
      );
    } else {
      context.drawImage(this.background, 0, 0);
      context.save();
      context.translate(width * 2, 0);
      context.scale(-1, 1);
      context.drawImage(this.background, 0, 0);
      context.restore();
    }

    this.drawSpriteCentered(
      this.logoCanvas,
      this.assets.logo,
      LOGIN_CENTER_X,
      18,
    );
    context.restore();
  }

  private drawButton(rect: Rect, label: string): void {
    this.drawSpriteAt(
      this.titleButtonCanvas,
      this.assets.titleButton,
      rect.x,
      rect.y,
    );
    this.bold12.draw(
      this.context,
      label,
      rect.x + Math.floor(rect.width / 2),
      rect.y + Math.floor(rect.height / 2) + 5,
      WHITE,
      'center',
    );
  }

  private drawSpriteCentered(
    image: HTMLCanvasElement,
    sprite: CacheSpriteFrame,
    centerX: number,
    y: number,
  ): void {
    this.drawSpriteAt(
      image,
      sprite,
      centerX - Math.floor(sprite.width / 2),
      y,
    );
  }

  private drawSpriteAt(
    image: HTMLCanvasElement,
    sprite: CacheSpriteFrame,
    x: number,
    y: number,
  ): void {
    this.context.drawImage(
      image,
      x + sprite.xOffset,
      y + sprite.yOffset,
    );
  }

  private usernameRect(): Rect {
    return {
      x: LOGIN_CENTER_X - 120,
      y: USERNAME_BASELINE_Y - 14,
      width: 240,
      height: 18,
    };
  }

  private passwordRect(): Rect {
    return {
      x: LOGIN_CENTER_X - 120,
      y: PASSWORD_BASELINE_Y - 14,
      width: 240,
      height: 18,
    };
  }

  private buttonRect(offset: number): Rect {
    const sprite = this.assets.titleButton;
    return {
      x:
        LOGIN_CENTER_X + offset -
        Math.floor(sprite.width / 2),
      y:
        BUTTON_CENTER_Y -
        Math.floor(sprite.height / 2),
      width: sprite.width,
      height: sprite.height,
    };
  }
}

function createSpriteCanvas(
  sprite: CacheSpriteFrame,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, sprite.width);
  canvas.height = Math.max(1, sprite.height);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas is unavailable for cache sprites.');
  }

  const image = context.createImageData(sprite.width, sprite.height);
  image.data.set(cacheSpriteToRgba(sprite));
  context.putImageData(image, 0, 0);
  return canvas;
}

async function decodeCacheJpeg(
  bytes: Uint8Array,
): Promise<CacheImageSource> {
  const blob = new Blob(
    [bytes.slice().buffer as ArrayBuffer],
    { type: 'image/jpeg' },
  );

  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob);
  }

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode cache title.jpg.'));
    };
    image.src = url;
  });
}

function imageWidth(image: CacheImageSource): number {
  return image instanceof HTMLImageElement
    ? image.naturalWidth
    : image.width;
}

function imageHeight(image: CacheImageSource): number {
  return image instanceof HTMLImageElement
    ? image.naturalHeight
    : image.height;
}

function contains(
  rect: Rect,
  x: number,
  y: number,
): boolean {
  return x >= rect.x &&
    y >= rect.y &&
    x < rect.x + rect.width &&
    y < rect.y + rect.height;
}
