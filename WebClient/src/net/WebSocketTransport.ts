export type TransportState = 'idle' | 'connecting' | 'open' | 'closed';

export class WebSocketTransport {
  private socket: WebSocket | null = null;

  state: TransportState = 'idle';
  onData: ((data: ArrayBuffer) => void) | null = null;
  onText: ((text: string) => void) | null = null;
  onStateChange: ((state: TransportState) => void) | null = null;
  onError: ((error: Event) => void) | null = null;

  async connect(url: string): Promise<void> {
    this.disconnect();

    this.state = 'connecting';
    this.onStateChange?.(this.state);

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url);
      socket.binaryType = 'arraybuffer';
      this.socket = socket;

      const failBeforeOpen = (event: Event) => {
        reject(new Error('WebSocket connection failed.'));
        this.onError?.(event);
      };

      socket.addEventListener('open', () => {
        socket.removeEventListener('error', failBeforeOpen);
        this.state = 'open';
        this.onStateChange?.(this.state);
        resolve();
      }, { once: true });

      socket.addEventListener('error', failBeforeOpen, { once: true });

      socket.addEventListener('message', (event) => {
        if (typeof event.data === 'string') {
          this.onText?.(event.data);
          return;
        }

        if (event.data instanceof ArrayBuffer) {
          this.onData?.(event.data);
          return;
        }

        if (event.data instanceof Blob) {
          void event.data.arrayBuffer().then((data) => this.onData?.(data));
        }
      });

      socket.addEventListener('close', () => {
        if (this.socket === socket) {
          this.socket = null;
          this.state = 'closed';
          this.onStateChange?.(this.state);
        }
      });

      socket.addEventListener('error', (event) => {
        this.onError?.(event);
      });
    });
  }

  send(data: Uint8Array): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket transport is not open.');
    }
    this.socket.send(data);
  }

  disconnect(): void {
    const socket = this.socket;
    this.socket = null;

    if (socket && (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    )) {
      socket.close(1000, 'Client disconnect');
    }

    if (this.state !== 'idle') {
      this.state = 'closed';
      this.onStateChange?.(this.state);
    }
  }
}
