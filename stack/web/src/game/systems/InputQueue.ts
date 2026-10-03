export type QueuedInputHandler = (columnIndex: number) => Promise<void> | void;

export class InputQueue {
  static readonly MAX_QUEUE = 2;

  private readonly queue: number[] = [];
  private processing = false;
  private disposed = false;

  constructor(
    private readonly onColumnTap: QueuedInputHandler,
    private readonly onError: (error: unknown) => void = () => undefined,
  ) {}

  get pendingCount(): number {
    return this.queue.length;
  }

  enqueue(columnIndex: number): boolean {
    if (this.disposed || this.queue.length >= InputQueue.MAX_QUEUE) return false;
    this.queue.push(columnIndex);
    void this.drain();
    return true;
  }

  clear(): void {
    this.queue.length = 0;
  }

  dispose(): void {
    this.disposed = true;
    this.clear();
  }

  private async drain(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      while (!this.disposed && this.queue.length > 0) {
        const columnIndex = this.queue.shift();
        if (columnIndex !== undefined) {
          try {
            await this.onColumnTap(columnIndex);
          } catch (error: unknown) {
            this.clear();
            if (!this.disposed) this.onError(error);
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }
}
