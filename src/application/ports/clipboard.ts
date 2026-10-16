import type { Result } from "../../domain/index.ts";

export interface ClipboardUnavailable {
  readonly reason: string;
}

export interface Clipboard {
  copy(text: string): Promise<Result<void, ClipboardUnavailable>>;
}
