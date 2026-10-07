const VIEWPORT_WIDTH = 765;
const VIEWPORT_HEIGHT = 503;
const CENTER_X = 382;
const PROGRESS_X = 230;
const PROGRESS_Y = 233;
const PROGRESS_WIDTH = 304;
const PROGRESS_HEIGHT = 34;
const PROGRESS_FILL_WIDTH = 300;
const PROGRESS_RED = '#8c1111';

/**
 * Pre-title GameShell-style loading renderer.
 *
 * The real client draws this before title.jpg/fonts are available, so this
 * deliberately has no dependency on cache assets. Once the title archive is
 * ready, CacheTitleScreenRenderer takes over and draws the state-5 title
 * loading screen with the cache-backed font/background.
 */
export class ClientBootRenderer {
  private readonly context: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('2D canvas is unavailable for the client loader.');
    }
    this.context = context;
  }

  render(progress: number, message: string): void {
    const context = this.context;
    const percent = Math.max(0, Math.min(100, Math.floor(progress)));
    const fillWidth = Math.floor(percent * 3);

    this.canvas.hidden = false;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.imageSmoothingEnabled = false;
    context.fillStyle = '#000';
    context.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    context.font = 'bold 13px Helvetica, Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    context.fillStyle = '#fff';
    context.fillText(
      'RuneScape is loading - please wait...',
      CENTER_X,
      225,
    );

    drawRect(
      context,
      PROGRESS_X,
      PROGRESS_Y,
      PROGRESS_WIDTH,
      PROGRESS_HEIGHT,
      PROGRESS_RED,
    );
    drawRect(
      context,
      PROGRESS_X + 1,
      PROGRESS_Y + 1,
      PROGRESS_WIDTH - 2,
      PROGRESS_HEIGHT - 2,
      '#000',
    );

    context.fillStyle = PROGRESS_RED;
    context.fillRect(
      PROGRESS_X + 2,
      PROGRESS_Y + 2,
      fillWidth,
      30,
    );
    context.fillStyle = '#000';
    context.fillRect(
      PROGRESS_X + 2 + fillWidth,
      PROGRESS_Y + 2,
      PROGRESS_FILL_WIDTH - fillWidth,
      30,
    );

    context.fillStyle = '#fff';
    context.fillText(message, CENTER_X, 256);
    context.restore();
  }
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
