export interface ItemIdentity {
  readonly device: number;
  readonly inode: number;
  readonly isSymbolicLink: boolean;
}

export const isSameItem = (left: ItemIdentity, right: ItemIdentity): boolean =>
  left.device === right.device &&
  left.inode === right.inode &&
  left.isSymbolicLink === right.isSymbolicLink;
