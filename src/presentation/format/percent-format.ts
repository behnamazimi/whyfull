const PERCENT = 100;

export const formatPercent = (share: number): string => `${String(Math.round(share * PERCENT))}%`;
