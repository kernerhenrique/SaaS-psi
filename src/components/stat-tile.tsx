import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

import { TONE_CLASSES, type Tone } from "./status-badge";

/** Número de destaque do dashboard, com ícone num círculo pastel e uma linha explicando o que ele significa. */
export function StatTile({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  className,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  hint: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-soft sm:gap-4 sm:p-5 ring-1 ring-foreground/5", className)}>
      <div className="flex items-center gap-2.5 sm:gap-3">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl sm:size-9", TONE_CLASSES[tone])}>
          <Icon className="size-[18px]" />
        </span>
        <p className="text-xs leading-tight font-medium text-muted-foreground sm:text-sm">{label}</p>
      </div>
      <div className="space-y-1">
        <p className="font-display text-2xl font-medium tracking-tight tabular-nums sm:text-3xl">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
