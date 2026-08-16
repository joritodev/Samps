export const SMALL_SAMPLE_N = 3;

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) return sorted[middle]!;
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function stdDev(values: number[]): number | null {
  if (values.length < 2) return null;

  const average = mean(values)!;
  const variance =
    values.reduce(
      (sum, value) => sum + (value - average) ** 2,
      0,
    ) /
    (values.length - 1);

  return Math.sqrt(variance);
}

export function onTimeRate(
  onTime: number,
  withDueDate: number,
): number | null {
  if (withDueDate === 0) return null;
  return onTime / withDueDate;
}
