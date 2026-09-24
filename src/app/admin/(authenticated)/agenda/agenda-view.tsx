"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { addDaysToIsoDate, formatDateLabel, startOfWeekIso } from "@/lib/date";
import type { AgendaOptions, AgendaSession } from "@/server/modules/session/session.service";

import { NewSessionDialog, type NewSessionDraft } from "./new-session-dialog";
import { ScheduleGrid } from "./schedule-grid";
import { SessionDetailsDialog } from "./session-details-dialog";

type View = "week" | "day";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function shortLabel(dateISO: string): string {
  return `${Number(dateISO.slice(8))} ${MONTHS[Number(dateISO.slice(5, 7)) - 1]}`;
}

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function AgendaView({
  today,
  timezone,
  selectedDate,
  weekStart,
  sessions,
  options,
  reminderTemplate,
  openNewSession = false,
  initialPatientId,
}: {
  today: string;
  timezone: string;
  selectedDate: string;
  weekStart: string;
  sessions: AgendaSession[];
  options: AgendaOptions;
  reminderTemplate: string;
  openNewSession?: boolean;
  initialPatientId?: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("week");
  const [day, setDay] = useState(selectedDate);
  const [draft, setDraft] = useState<NewSessionDraft | null>(
    openNewSession ? { date: selectedDate, time: "09:00", patientId: initialPatientId } : null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // No celular a semana inteira fica apertada: começa na visão do dia.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende da largura da tela, só conhecida no navegador
    if (window.matchMedia("(max-width: 767px)").matches) setView("day");
  }, []);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysToIsoDate(weekStart, i));
  const sunday = weekDays[6];
  // Domingo só aparece se tiver consulta.
  const visibleWeekDays = sessions.some((s) => s.date === sunday) ? weekDays : weekDays.slice(0, 6);
  const days = view === "week" ? visibleWeekDays : [day];
  // Busca pelo id para o modal sempre mostrar a versão mais recente depois de salvar.
  const selectedSession = sessions.find((s) => s.id === selectedId) ?? null;

  function goTo(date: string) {
    if (startOfWeekIso(date) === weekStart) {
      setDay(date);
    } else {
      router.push(`/admin/agenda?data=${date}`);
    }
  }

  function step(direction: 1 | -1) {
    goTo(addDaysToIsoDate(view === "week" ? weekStart : day, view === "week" ? 7 * direction : direction));
  }

  const title =
    view === "week"
      ? `${shortLabel(weekDays[0])} – ${shortLabel(visibleWeekDays[visibleWeekDays.length - 1])}`
      : capitalizeFirst(formatDateLabel(day, timezone));

  const dayCount = sessions.filter((s) => days.includes(s.date)).length;

  return (
    <div className="space-y-6">
      <FadeIn>
        <PageHeader
          title="Agenda"
          description="Toque em um horário vago para marcar, ou em uma consulta para ver as opções."
          actions={
            <Button size="lg" className="h-10 rounded-xl px-4" onClick={() => setDraft({ date: day, time: "09:00" })}>
              <Plus />
              Nova consulta
            </Button>
          }
        />
      </FadeIn>

      <FadeIn delay={0.05} className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-card shadow-soft ring-1 ring-foreground/5">
            <Button variant="ghost" size="icon" onClick={() => step(-1)} aria-label={view === "week" ? "Semana anterior" : "Dia anterior"}>
              <ChevronLeft />
            </Button>
            <Button variant="ghost" onClick={() => goTo(today)} disabled={view === "day" ? day === today : weekStart === startOfWeekIso(today)}>
              Hoje
            </Button>
            <Button variant="ghost" size="icon" onClick={() => step(1)} aria-label={view === "week" ? "Próxima semana" : "Próximo dia"}>
              <ChevronRight />
            </Button>
          </div>
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">
              {dayCount === 0 ? "Nenhuma consulta" : dayCount === 1 ? "1 consulta" : `${dayCount} consultas`}
            </p>
          </div>
        </div>
        <Segmented
          label="Visualização"
          value={view}
          onChange={setView}
          options={[
            { value: "day", label: "Dia" },
            { value: "week", label: "Semana" },
          ]}
        />
      </FadeIn>

      {view === "day" ? (
        // Faixa com os dias da semana para trocar rápido no celular.
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {weekDays.map((d) => {
            const count = sessions.filter((s) => s.date === d).length;
            const selected = d === day;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                aria-pressed={selected}
                className={`flex min-w-12 flex-col items-center rounded-xl px-2.5 py-1.5 text-xs transition ${
                  selected ? "bg-primary text-primary-foreground shadow-soft" : "bg-card ring-1 ring-foreground/5 hover:bg-muted"
                }`}
              >
                <span className="uppercase opacity-80">{formatDateLabel(d, timezone).slice(0, 3)}</span>
                <span className="text-base font-semibold tabular-nums">{Number(d.slice(8))}</span>
                <span className={`size-1.5 rounded-full ${count ? (selected ? "bg-primary-foreground" : "bg-primary") : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>
      ) : null}

      <FadeIn delay={0.1}>
        <ScheduleGrid
          days={days}
          sessions={sessions}
          today={today}
          timezone={timezone}
          onSelectSession={(s) => setSelectedId(s.id)}
          onCreateAt={(date, time) => setDraft({ date, time })}
        />
      </FadeIn>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-tone-peach" /> Primeira consulta
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-tone-sky" /> Retorno
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-tone-stone" /> Faltou
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-tone-honey-foreground" /> Pagamento pendente
        </span>
      </div>

      <NewSessionDialog draft={draft} options={options} onClose={() => setDraft(null)} />
      <SessionDetailsDialog
        session={selectedSession}
        today={today}
        timezone={timezone}
        reminderTemplate={reminderTemplate}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
