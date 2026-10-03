type CancelAnimation = () => void;
type StartAnimation = (complete: () => void) => CancelAnimation;

/** Scene-owned animations always settle, including when a redraw destroys their targets. */
export class AnimationTasks {
  private readonly pending = new Set<CancelAnimation>();

  run(start: StartAnimation): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let stop: CancelAnimation | undefined;
      const finish = (completed: boolean): void => {
        if (settled) return;
        settled = true;
        this.pending.delete(cancel);
        resolve(completed);
      };
      const cancel = (): void => {
        finish(false);
        stop?.();
      };
      this.pending.add(cancel);
      try {
        stop = start(() => finish(true));
      } catch (error: unknown) {
        settled = true;
        this.pending.delete(cancel);
        reject(error);
      }
    });
  }

  cancelAll(): void {
    for (const cancel of [...this.pending]) cancel();
  }
}
