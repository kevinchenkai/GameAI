export type QueuedInputHandler = (columnIndex: number) => Promise<void> | void;

export class InputQueue {
  static readonly MAX_QUEUE = 2;

  private readonly queue: number[] = [];
  private processing = false;

  constructor(private readonly onColumnTap: QueuedInputHandler) {}

  get pendingCount(): number {
    return this.queue.length;
  }

  enqueue(columnIndex: number): boolean {
    if (this.queue.length >= InputQueue.MAX_QUEUE) return false;
    this.queue.push(columnIndex);
    void this.drain();
    return true;
  }

  clear(): void {
    this.queue.length = 0;
  }

  private async drain(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const columnIndex = this.queue.shift();
        if (columnIndex !== undefined) await this.onColumnTap(columnIndex);
      }
    } finally {
      this.processing = false;
    }
  }
}
