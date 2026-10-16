export class ConcurrencyLimiter {
  private running = 0;
  private readonly queue: (() => void)[] = [];

  constructor(private readonly maximumConcurrent: number) {}

  async run<Value>(task: () => Promise<Value>): Promise<Value> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.running < this.maximumConcurrent) {
      this.running += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  private release(): void {
    const next = this.queue.shift();
    if (next === undefined) this.running -= 1;
    else next();
  }
}
