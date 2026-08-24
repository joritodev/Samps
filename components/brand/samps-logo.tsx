"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export type SampsLogoProps = {
  className?: string;
  /** Show wordmark SAMPS / DIGITAL beside the mark. Default true. */
  withWordmark?: boolean;
  /** Accessible name. Default "Samps Digital". */
  title?: string;
};

export function SampsLogo({
  className,
  withWordmark = true,
  title = "Samps Digital",
}: SampsLogoProps): JSX.Element {
  const gradientId = `samps-cam-gradient-${useId().replace(/:/g, "")}`;
  const stroke = `url(#${gradientId})`;

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 48 48"
        className="h-8 w-8 shrink-0"
        aria-hidden={withWordmark ? true : undefined}
        role={withWordmark ? undefined : "img"}
      >
        {!withWordmark ? <title>{title}</title> : null}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E08A5C" />
            <stop offset="100%" stopColor="#2EB5C9" />
          </linearGradient>
        </defs>
        <rect
          x="6"
          y="14"
          width="36"
          height="26"
          rx="6"
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
        />
        <circle
          cx="24"
          cy="27"
          r="8"
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
        />
        <circle
          cx="24"
          cy="27"
          r="3"
          fill="none"
          stroke={stroke}
          strokeWidth="2"
        />
        <path
          d="M16 14 V10 H32 V14"
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      {withWordmark ? (
        <span className="flex flex-col leading-none">
          <span className="font-display text-base font-bold tracking-tight text-foreground">
            SAMPS
          </span>
          <span className="text-[10px] font-medium tracking-[0.28em] text-muted-foreground">
            DIGITAL
          </span>
        </span>
      ) : null}
    </span>
  );
}
