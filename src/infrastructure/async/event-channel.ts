type Waiter<Event> = (result: IteratorResult<Event, undefined>) => void;

export class EventChannel<Event> implements AsyncIterable<Event> {
  private readonly buffered: Event[] = [];
  private readonly waiters: Waiter<Event>[] = [];
  private closed = false;

  push(event: Event): void {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter === undefined) this.buffered.push(event);
    else waiter({ value: event, done: false });
  }

  close(): void {
    this.closed = true;
    for (const waiter of this.waiters.splice(0)) waiter({ value: undefined, done: true });
  }

  [Symbol.asyncIterator](): AsyncIterator<Event, undefined> {
    return {
      next: () => {
        const event = this.buffered.shift();
        if (event !== undefined) return Promise.resolve({ value: event, done: false });
        if (this.closed) return Promise.resolve({ value: undefined, done: true });
        return new Promise((resolve) => this.waiters.push(resolve));
      },
    };
  }
}
