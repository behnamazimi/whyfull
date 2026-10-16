export const pluralize = (count: number, one: string, other: string): string =>
  count === 1 ? one : other;
