export type PerformancePreset = "today" | "week" | "month" | "custom";

type PerformanceRangeInput = {
  preset?: string;
  from?: string;
  to?: string;
  now?: Date;
};

type PerformanceRange = {
  from: Date;
  to: Date;
  preset: PerformancePreset;
};

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseLocalDate(value: string | undefined): Date | null {
  if (!value) return null;

  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

export function resolvePerformanceRange(
  input: PerformanceRangeInput,
): PerformanceRange {
  const now = input.now ?? new Date();
  const customFrom = parseLocalDate(input.from);
  const customTo = parseLocalDate(input.to);

  if (customFrom && customTo) {
    return {
      from: startOfDay(customFrom),
      to: endOfDay(customTo),
      preset: "custom",
    };
  }

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  if (input.preset === "today") {
    return { from: todayStart, to: todayEnd, preset: "today" };
  }

  if (input.preset === "week") {
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    return { from: weekStart, to: todayEnd, preset: "week" };
  }

  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: todayEnd,
    preset: "month",
  };
}
