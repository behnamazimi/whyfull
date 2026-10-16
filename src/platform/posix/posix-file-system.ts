import { lstat, rm } from "node:fs/promises";
import type { FileInspector, FileRemover } from "../../application/index.ts";
import { failure, success } from "../../domain/index.ts";

export const posixFileInspector: FileInspector = {
  async identityOf(path) {
    try {
      const stats = await lstat(path.toString());
      return { device: stats.dev, inode: stats.ino, isSymbolicLink: stats.isSymbolicLink() };
    } catch {
      return undefined;
    }
  },
};

export const posixFileRemover: FileRemover = {
  async removeRecursively(path) {
    try {
      await rm(path.toString(), { recursive: true, force: false });
      return success(undefined);
    } catch (error) {
      return failure({ reason: String(error) });
    }
  },
};
