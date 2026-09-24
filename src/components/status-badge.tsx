import { cn } from "cn";

export type Tone = "sage" | "honey" | "peach" | "sky" | "stone";

/** Classes de fundo + texto de cada tom pastel (tokens em globals.css). */
export const TONE_CLASSES: Record<Tone, string> = {
  sage: "bg-tone-sage text-tone-sage-foreground",
  honey: "bg-tone-honey text-tone-honey-foreground",
  peach: "bg-tone-peach text-tone-peach-foreground",
  sky: "bg-tone-sky text-tone-sky-foreground",
  stone: "bg-tone-stone text-tone-stone-foreground",
};

export type StatusKind =
  | "paid"
  | "pending"
  | "wont-pay"
  | "first-visit"
  | "return-visit"
  | "scheduled"
  | "done"
  | "cancelled"
  | "no-show";

// Cada status tem cor e texto fixos para a psicóloga reconhecer de relance,
// em qualquer tela (agenda, ficha do paciente, financeiro).
const STATUS: Record<StatusKind, { label: string; tone: Tone }> = {
  paid: { label: "Pago", tone: "sage" },
  pending: { label: "Pendente", tone: "honey" },
  "wont-pay": { label: "Não vai pagar", tone: "stone" },
  "first-visit": { label: "Primeira consulta", tone: "peach" },
  "return-visit": { label: "Retorno", tone: "sky" },
  scheduled: { label: "Agendada", tone: "sky" },
  done: { label: "Realizada", tone: "sage" },
  cancelled: { label: "Cancelada", tone: "stone" },
  "no-show": { label: "Faltou", tone: "peach" },
};

export function StatusBadge({ status, className }: { status: StatusKind; className?: string }) {
  const { label, tone } = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
