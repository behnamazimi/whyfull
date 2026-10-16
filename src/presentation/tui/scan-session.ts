import {
  DiagnosisUpdateKind,
  type DiagnoseDisk,
  type DiagnosisUpdate,
} from "../../application/index.ts";
import type { ScanScope } from "../../domain/index.ts";

export class ScanSession {
  private cancellation = new AbortController();

  constructor(
    private readonly diagnoseDisk: DiagnoseDisk,
    private readonly onUpdate: (update: DiagnosisUpdate) => void,
  ) {}

  start(scope: ScanScope): void {
    this.stop();
    const cancellation = new AbortController();
    this.cancellation = cancellation;
    void this.follow(scope, cancellation.signal);
  }

  stop(): void {
    this.cancellation.abort();
  }

  private async follow(scope: ScanScope, signal: AbortSignal): Promise<void> {
    try {
      for await (const update of this.diagnoseDisk.run(scope, signal)) {
        if (signal.aborted) return;
        this.onUpdate(update);
      }
    } catch (error) {
      if (!signal.aborted) {
        this.onUpdate({ kind: DiagnosisUpdateKind.Failed, reason: String(error) });
      }
    }
  }
}
