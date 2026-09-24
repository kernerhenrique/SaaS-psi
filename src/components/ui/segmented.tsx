"use client";

import { cn } from "cn";

export type SegmentedOption<T extends string> = { value: T; label: React.ReactNode; hint?: React.ReactNode };

/**
 * Escolha única em botões lado a lado (mais fácil que um menu suspenso,
 * principalmente no celular). Acessível como grupo de rádio.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T | null;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-h-9 flex-col items-start justify-center rounded-xl px-3.5 py-1.5 text-left text-sm font-medium ring-1 transition outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              selected
                ? "bg-primary text-primary-foreground shadow-soft ring-primary"
                : "bg-card ring-input hover:bg-muted",
            )}
          >
            {option.label}
            {option.hint ? (
              <span className={cn("text-xs font-normal", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {option.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
