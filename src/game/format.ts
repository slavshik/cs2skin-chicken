const fixed2 = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/** Cents as `1,234.50`. */
export const formatMoney = (cents: number): string => fixed2.format(cents / 100);

/** Hundredths as `x1.01`. */
export const formatMult = (hundredths: number): string => `x${fixed2.format(hundredths / 100)}`;

/** Hundredths for tight labels: `x1.01`, `x245.60`, `x1.2K`, `x3.17M`. */
export function formatMultShort(hundredths: number): string {
    const v = hundredths / 100;
    if (v >= 1e6) return `x${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `x${(v / 1e3).toFixed(1)}K`;
    return `x${fixed2.format(v)}`;
}
