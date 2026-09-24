import { cn } from "cn";

/** Ilustração neutra (formas pastel), sem a marca de nenhuma psicóloga específica. */
function SoftShapesIllustration() {
  return (
    <svg viewBox="0 0 120 80" className="h-20 w-32" aria-hidden>
      <ellipse cx="44" cy="44" rx="30" ry="22" className="fill-tone-honey" />
      <ellipse cx="78" cy="32" rx="20" ry="24" className="fill-tone-sage" />
      <ellipse cx="80" cy="60" rx="16" ry="12" className="fill-tone-peach" />
      <ellipse cx="52" cy="66" rx="12" ry="10" className="fill-tone-stone" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center",
        className,
      )}
    >
      <SoftShapesIllustration />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description ? <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
