import {
  cacheSpriteToRgba,
  type CacheSpriteFrame,
} from '../cache/CacheSpriteDecoder';
import type { TitleScreenAssets } from '../cache/TitleScreenAssets';
import { CacheBitmapFont } from './CacheBitmapFont';
import { CacheLoginFlameAnimation } from './CacheLoginFlameAnimation';

const VIEWPORT_WIDTH = 765;
const VIEWPORT_HEIGHT = 503;
const LOGIN_CENTER_X = 382;
const TITLE_BOX_X = 202;
const TITLE_BOX_Y = 171;
const WELCOME_BUTTON_Y = 291;
const LOGIN_BUTTON_Y = 321;
const LEFT_BUTTON_X = 302;
const RIGHT_BUTTON_X = 462;
const WHITE = 0xffffff;
const YELLOW = 0xffff00;
const PROGRESS_RED = '#8c1111';

export type LoginField = 'username' | 'password';

export type TitleHitTarget =
  | 'new-user'
  | 'existing-user'
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

export interface ConnectingRenderState {
  readonly username: string;
  readonly password: string;
  readonly message?: string;
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

type CacheImageSource = ImageBitmap | HTMLImageElement;

type TitleView =
  | { readonly kind: 'welcome' }
  | {
      readonly kind: 'login';
      readonly state: LoginRenderState;
    }
  | { readonly kind: 'new-user' }
  | {
      readonly kind: 'connecting';
      readonly state: ConnectingRenderState;
    }
  | {
      readonly kind: 'loading';
      readonly progress: number;
      readonly message: string;
    };

/**
 * Cache-backed title renderer matching the original fixed 765x503 title
 * client flow: state-5 loading, state-10 welcome/login/new-user and the
 * state-20 connecting form.
 *
 * Coordinates, button centres and text baselines intentionally follow the
 * byte-faithful TitleScreen implementation used by Olden-Shire/OS instead of
 * inventing responsive web layouts inside the game canvas.
 */
export class CacheTitleScreenRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly bold12: CacheBitmapFont;
  private readonly logoCanvas: HTMLCanvasElement;
  private readonly titleBoxCanvas: HTMLCanvasElement;
  private readonly titleButtonCanvas: HTMLCanvasElement;
  private readonly flames: CacheLoginFlameAnimation;
  private currentView: TitleView | null = null;

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
    this.bold12 = new CacheBitmapFont(assets.bold12);
    this.logoCanvas = createSpriteCanvas(assets.logo);
    this.titleBoxCanvas = createSpriteCanvas(assets.titleBox);
    this.titleButtonCanvas = createSpriteCanvas(assets.titleButton);
    this.flames = new CacheLoginFlameAnimation(assets.runes);
  }

  static async create(
    canvas: HTMLCanvasElement,
    assets: TitleScreenAssets,
  ): Promise<CacheTitleScreenRenderer> {
    const background = await decodeCacheJpeg(assets.backgroundJpeg);
    return new CacheTitleScreenRenderer(canvas, background, assets);
  }

  renderWelcome(): void {
    this.currentView = { kind: 'welcome' };
    this.renderFrame(performance.now());
  }

  renderLogin(state: LoginRenderState): void {
    this.currentView = {
      kind: 'login',
      state: {
        username: state.username,
        password: state.password,
        selectedField: state.selectedField,
        message: state.message,
        showCursor: state.showCursor,
      },
    };
    this.renderFrame(performance.now());
  }

  renderNewUser(): void {
    this.currentView = { kind: 'new-user' };
    this.renderFrame(performance.now());
  }

  renderConnecting(state: ConnectingRenderState): void {
    this.currentView = {
      kind: 'connecting',
      state: {
        username: state.username,
        password: state.password,
        message: state.message,
      },
    };
    this.renderFrame(performance.now());
  }

  renderLoading(progress: number, message: string): void {
    this.currentView = {
      kind: 'loading',
      progress: clampProgress(progress),
      message,
    };
    this.renderFrame(performance.now());
  }

  /**
   * Repaint the retained state so the cache-backed flame animation keeps
   * running even when title input/status text has not changed.
   */
  renderFrame(timestampMs: number): void {
    const view = this.currentView;
    if (!view) {
      return;
    }

    switch (view.kind) {
      case 'welcome':
        this.drawWelcome(timestampMs);
        return;
      case 'login':
        this.drawLogin(view.state, timestampMs);
        return;
      case 'new-user':
        this.drawNewUser(timestampMs);
        return;
      case 'connecting':
        this.drawConnecting(view.state, timestampMs);
        return;
      case 'loading':
        this.drawLoading(view.progress, view.message, timestampMs);
        return;
    }
  }

  hitTest(x: number, y: number): TitleHitTarget {
    const view = this.currentView;
    if (!view) {
      return null;
    }

    if (view.kind === 'welcome') {
      if (contains(this.buttonHitRect(LEFT_BUTTON_X, WELCOME_BUTTON_Y), x, y)) {
        return 'new-user';
      }
      if (contains(this.buttonHitRect(RIGHT_BUTTON_X, WELCOME_BUTTON_Y), x, y)) {
        return 'existing-user';
      }
      return null;
    }

    if (view.kind === 'login') {
      if (contains(this.usernameRect(), x, y)) {
        return 'username';
      }
      if (contains(this.passwordRect(), x, y)) {
        return 'password';
      }
      if (contains(this.buttonHitRect(LEFT_BUTTON_X, LOGIN_BUTTON_Y), x, y)) {
        return 'login';
      }
      if (contains(this.buttonHitRect(RIGHT_BUTTON_X, LOGIN_BUTTON_Y), x, y)) {
        return 'cancel';
      }
      return null;
    }

    if (view.kind === 'new-user') {
      return contains(
        this.buttonHitRect(LOGIN_CENTER_X, LOGIN_BUTTON_Y),
        x,
        y,
      )
        ? 'cancel'
        : null;
    }

    return null;
  }

  private drawWelcome(timestampMs: number): void {
    this.drawBase(timestampMs);
    this.drawTitleBoxOriginal();

    this.bold12.draw(
      this.context,
      'Welcome to RuneScape',
      LOGIN_CENTER_X,
      251,
      YELLOW,
      'center',
    );

    this.drawButton(LEFT_BUTTON_X, WELCOME_BUTTON_Y, 'New User');
    this.drawButton(RIGHT_BUTTON_X, WELCOME_BUTTON_Y, 'Existing User');
  }

  private drawLogin(
    state: LoginRenderState,
    timestampMs: number,
  ): void {
    this.drawBase(timestampMs);
    this.drawTitleBoxOriginal();

    const message = state.message ?? 'Enter your username/email & password.';
    this.drawLoginMessages('', message, '');

    const usernameY = 266;
    const passwordY = 281;

    this.bold12.draw(
      this.context,
      'Login: ',
      272,
      usernameY,
      WHITE,
    );

    const username = this.bold12.fitTail(state.username, 200);
    this.bold12.draw(
      this.context,
      username,
      312,
      usernameY,
      WHITE,
    );

    if (
      state.selectedField === 'username' &&
      state.showCursor !== false
    ) {
      this.bold12.draw(
        this.context,
        '|',
        312 + this.bold12.measure(username),
        usernameY,
        YELLOW,
        'left',
      );
    }

    const passwordLine =
      'Password: ' + '*'.repeat(state.password.length);
    this.bold12.draw(
      this.context,
      passwordLine,
      274,
      passwordY,
      WHITE,
    );

    if (
      state.selectedField === 'password' &&
      state.showCursor !== false
    ) {
      this.bold12.draw(
        this.context,
        '|',
        274 + this.bold12.measure(passwordLine),
        passwordY,
        YELLOW,
        'left',
      );
    }

    this.drawButton(LEFT_BUTTON_X, LOGIN_BUTTON_Y, 'Login');
    this.drawButton(RIGHT_BUTTON_X, LOGIN_BUTTON_Y, 'Cancel');
  }

  private drawNewUser(timestampMs: number): void {
    this.drawBase(timestampMs);
    this.drawTitleBoxOriginal();

    this.bold12.draw(
      this.context,
      'How to Play',
      LOGIN_CENTER_X,
      211,
      YELLOW,
      'center',
    );
    this.bold12.draw(
      this.context,
      'To play Old School RuneScape, you will',
      LOGIN_CENTER_X,
      236,
      WHITE,
      'center',
    );
    this.bold12.draw(
      this.context,
      'need to be a current RuneScape member,',
      LOGIN_CENTER_X,
      251,
      WHITE,
      'center',
    );
    this.bold12.draw(
      this.context,
      "and have voted 'Yes' on the poll on the",
      LOGIN_CENTER_X,
      266,
      WHITE,
      'center',
    );
    this.bold12.draw(
      this.context,
      'RuneScape home page.',
      LOGIN_CENTER_X,
      281,
      WHITE,
      'center',
    );

    this.drawButton(LOGIN_CENTER_X, LOGIN_BUTTON_Y, 'Cancel');
  }

  private drawConnecting(
    state: ConnectingRenderState,
    timestampMs: number,
  ): void {
    this.drawBase(timestampMs);
    this.drawTitleBoxCentered(382, 271);
    this.drawLoginMessages(
      '',
      state.message ?? 'Connecting to server...',
      '',
    );

    this.bold12.draw(
      this.context,
      'Login: ',
      272,
      266,
      WHITE,
    );
    this.bold12.draw(
      this.context,
      this.bold12.fitTail(state.username, 200),
      312,
      266,
      WHITE,
    );
    this.bold12.draw(
      this.context,
      'Password: ' + '*'.repeat(state.password.length),
      274,
      281,
      WHITE,
    );
  }

  private drawLoading(
    progress: number,
    message: string,
    timestampMs: number,
  ): void {
    this.drawBase(timestampMs);

    this.bold12.draw(
      this.context,
      'RuneScape is loading - please wait...',
      LOGIN_CENTER_X,
      225,
      WHITE,
      'center',
      false,
    );

    drawRect(this.context, 230, 233, 304, 34, PROGRESS_RED);
    drawRect(this.context, 231, 234, 302, 32, '#000');

    const fillWidth = Math.floor(progress * 3);
    this.context.fillStyle = PROGRESS_RED;
    this.context.fillRect(232, 235, fillWidth, 30);
    this.context.fillStyle = '#000';
    this.context.fillRect(232 + fillWidth, 235, 300 - fillWidth, 30);

    this.bold12.draw(
      this.context,
      message,
      LOGIN_CENTER_X,
      256,
      WHITE,
      'center',
      false,
    );
  }

  private drawLoginMessages(
    line1: string,
    line2: string,
    line3: string,
  ): void {
    this.bold12.draw(
      this.context,
      line1,
      LOGIN_CENTER_X,
      211,
      YELLOW,
      'center',
    );
    this.bold12.draw(
      this.context,
      line2,
      LOGIN_CENTER_X,
      226,
      YELLOW,
      'center',
    );
    this.bold12.draw(
      this.context,
      line3,
      LOGIN_CENTER_X,
      241,
      YELLOW,
      'center',
    );
  }

  private drawBase(timestampMs: number): void {
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

    this.flames.draw(context, timestampMs);

    this.drawSpriteCentered(
      this.logoCanvas,
      this.assets.logo,
      LOGIN_CENTER_X,
      18,
    );
    context.restore();
  }

  private drawTitleBoxOriginal(): void {
    this.drawSpriteAt(
      this.titleBoxCanvas,
      this.assets.titleBox,
      TITLE_BOX_X,
      TITLE_BOX_Y,
    );
  }

  private drawTitleBoxCentered(centerX: number, centerY: number): void {
    this.drawSpriteAt(
      this.titleBoxCanvas,
      this.assets.titleBox,
      centerX - Math.floor(this.assets.titleBox.width / 2),
      centerY - Math.floor(this.assets.titleBox.height / 2),
    );
  }

  private drawButton(
    centerX: number,
    centerY: number,
    label: string,
  ): void {
    this.drawSpriteAt(
      this.titleButtonCanvas,
      this.assets.titleButton,
      centerX - 73,
      centerY - 20,
    );
    this.bold12.draw(
      this.context,
      label,
      centerX,
      centerY + 5,
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
      x: 272,
      y: 252,
      width: 310,
      height: 18,
    };
  }

  private passwordRect(): Rect {
    return {
      x: 274,
      y: 267,
      width: 308,
      height: 18,
    };
  }

  private buttonHitRect(centerX: number, centerY: number): Rect {
    return {
      x: centerX - 75,
      y: centerY - 20,
      width: 151,
      height: 41,
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

function clampProgress(progress: number): number {
  return Math.max(0, Math.min(100, Math.floor(progress)));
}

function drawRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
): void {
  context.fillStyle = fill;
  context.fillRect(x, y, width, 1);
  context.fillRect(x, y + height - 1, width, 1);
  context.fillRect(x, y, 1, height);
  context.fillRect(x + width - 1, y, 1, height);
}
