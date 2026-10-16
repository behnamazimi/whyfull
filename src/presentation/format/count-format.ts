const numberFormat = new Intl.NumberFormat("en-US");

export const formatCount = (count: number): string => numberFormat.format(count);
