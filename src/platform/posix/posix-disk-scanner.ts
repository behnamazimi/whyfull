import {
  ScanEventKind,
  type Clock,
  type DiskScanner,
  type ScanEvent,
  type ScanRequest,
} from "../../application/index.ts";
import { EventChannel } from "../../infrastructure/index.ts";
import { DirectoryWalk } from "./directory-walk.ts";

export class PosixDiskScanner implements DiskScanner {
  constructor(private readonly clock: Clock) {}

  scan(request: ScanRequest): AsyncIterable<ScanEvent> {
    const events = new EventChannel<ScanEvent>();
    void this.walkInto(events, request);
    return events;
  }

  private async walkInto(events: EventChannel<ScanEvent>, request: ScanRequest): Promise<void> {
    try {
      const snapshot = await new DirectoryWalk(request, events, this.clock).run();
      events.push({ kind: ScanEventKind.Finished, snapshot });
    } catch (error) {
      events.push({ kind: ScanEventKind.Failed, reason: String(error) });
    } finally {
      events.close();
    }
  }
}
