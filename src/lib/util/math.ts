export const round = (n: number, k: number, resolution: number): number => {
    const precision = Math.pow(10, Math.trunc(resolution))
    return Math.round(
        Math.round(((n + Number.EPSILON) * precision) / k) * k
    ) / precision;
};

export const percent = (value: number, percentage: number): number =>
    round((value * percentage / 100), 1, 3);

export const toPercent = (value: number, whole: number): number => (
    round(((value * 100) / whole), 1, 3)
);

export const divideSeries = (numbers: []): number => (
    numbers.reduce((a, b) => round((a / b), 1, 3), 0)
);

export const divide = (a: number, b: number): number => (
    round((a / b), 1, 3)
);

export const sum = (numbers: number[]): number =>
    numbers.reduce((a, b) => round((a + b), 1, 3), 0);
