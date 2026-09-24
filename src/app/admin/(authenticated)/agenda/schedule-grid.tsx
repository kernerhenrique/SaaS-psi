"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "cn";

import { minutesToTime, utcToLocalMinutes } from "@/lib/date";
import { clampToRange, computeDayRange, hourMarks, minutesToHeightPx, minutesToTopPx } from "@/lib/schedule-grid-math";
import type { AgendaSession } from "@/server/modules/session/session.service";

const PIXELS_PER_HOUR = 72;
const SLOT_MINUTES = 30;
// Expediente "padrão" usado para desenhar a grade mesmo em dias vazios.
const DEFAULT_HOURS = [{ startMinute: 8 * 60, endMinute: 19 * 60 }];

const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function weekdayIndex(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Minuto atual no fuso da psicóloga, atualizado a cada minuto (linha do "agora"). */
function useNowMinute(timezone: string): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(utcToLocalMinutes(new Date(), timezone));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [timezone]);
  return now;
}

export function ScheduleGrid({
  days,
  sessions,
  today,
  timezone,
  onSelectSession,
  onCreateAt,
}: {
  days: string[];
  sessions: AgendaSession[];
  today: string;
  timezone: string;
  onSelectSession: (session: AgendaSession) => void;
  onCreateAt: (date: string, time: string) => void;
}) {
  const nowMinute = useNowMinute(timezone);
  const visible = sessions.filter((s) => days.includes(s.date));
  const range = computeDayRange(
    DEFAULT_HOURS,
    visible.map((s) => ({ startMinute: s.startMinute, endMinute: s.endMinute })),
  );
  const marks = hourMarks(range);
  const height = minutesToTopPx(range.rangeEndMinute, range, PIXELS_PER_HOUR);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Ao abrir (ou trocar de período), rola até a primeira consulta — ou até agora, se for hoje.
  const firstMinute = Math.min(
    ...visible.map((s) => s.startMinute),
    days.includes(today) && nowMinute !== null ? nowMinute : Infinity,
  );
  const scrollTarget = Number.isFinite(firstMinute) ? Math.max(range.rangeStartMinute, firstMinute - 60) : null;
  useEffect(() => {
    if (scrollTarget === null || !scrollRef.current) return;
    scrollRef.current.scrollTo({ top: minutesToTopPx(scrollTarget, range, PIXELS_PER_HOUR), behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rola só quando muda o período exibido, não a cada minuto
  }, [days.join(",")]);

  const slots: number[] = [];
  for (let m = range.rangeStartMinute; m < range.rangeEndMinute; m += SLOT_MINUTES) slots.push(m);

  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-foreground/5">
      {/* Cabeçalho com os dias (na visão de um dia só, a faixa acima da grade já mostra a data) */}
      <div className={cn("grid border-b", days.length === 1 && "hidden")} style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
        <div />
        {days.map((day) => {
          const isToday = day === today;
          return (
            <div key={day} className="flex flex-col items-center gap-0.5 py-3">
              <span className="text-xs font-medium text-muted-foreground uppercase">{WEEKDAY_SHORT[weekdayIndex(day)]}</span>
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {Number(day.slice(8))}
              </span>
            </div>
          );
        })}
      </div>

      {/* Corpo: horários + colunas dos dias */}
      <div ref={scrollRef} className="max-h-[70vh] overflow-y-auto">
        <div className="relative grid" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))`, height }}>
          <div className="relative">
            {marks.map((minute) => (
              <span
                key={minute}
                className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums first:translate-y-0"
                style={{ top: minutesToTopPx(minute, range, PIXELS_PER_HOUR) }}
              >
                {minutesToTime(minute)}
              </span>
            ))}
          </div>

          {days.map((day) => (
            <div key={day} className={cn("relative border-l", day === today && "bg-primary/[0.03]")}>
              {marks.map((minute) => (
                <div
                  key={minute}
                  aria-hidden
                  className="absolute inset-x-0 border-t border-border/60"
                  style={{ top: minutesToTopPx(minute, range, PIXELS_PER_HOUR) }}
                />
              ))}

              {/* Horários vagos clicáveis: abrem "Nova consulta" já com dia e hora. */}
              {slots.map((minute) => (
                <button
                  key={minute}
                  type="button"
                  onClick={() => onCreateAt(day, minutesToTime(minute))}
                  aria-label={`Marcar consulta em ${day.split("-").reverse().join("/")} às ${minutesToTime(minute)}`}
                  className="group absolute inset-x-1 flex items-center justify-center rounded-lg text-xs text-primary opacity-0 transition hover:bg-primary/8 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  style={{
                    top: minutesToTopPx(minute, range, PIXELS_PER_HOUR),
                    height: (SLOT_MINUTES / 60) * PIXELS_PER_HOUR,
                  }}
                >
                  <Plus className="size-3.5" /> {minutesToTime(minute)}
                </button>
              ))}

              {visible
                .filter((s) => s.date === day)
                .map((s) => {
                  const clamped = clampToRange({ startMinute: s.startMinute, endMinute: s.endMinute }, range);
                  if (!clamped) return null;
                  return (
                    <SessionBlock
                      key={s.id}
                      session={s}
                      top={minutesToTopPx(clamped.startMinute, range, PIXELS_PER_HOUR)}
                      height={minutesToHeightPx(clamped.startMinute, clamped.endMinute, PIXELS_PER_HOUR)}
                      onClick={() => onSelectSession(s)}
                    />
                  );
                })}

              {day === today && nowMinute !== null && nowMinute >= range.rangeStartMinute && nowMinute <= range.rangeEndMinute ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                  style={{ top: minutesToTopPx(nowMinute, range, PIXELS_PER_HOUR) }}
                >
                  <span className="-ml-1 size-2 rounded-full bg-destructive" />
                  <span className="h-px flex-1 bg-destructive/70" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SessionBlock({
  session,
  top,
  height,
  onClick,
}: {
  session: AgendaSession;
  top: number;
  height: number;
  onClick: () => void;
}) {
  const isNoShow = session.status === "NO_SHOW";
  const isDone = session.status === "DONE";
  const owes = isDone && session.paymentStatus === "PENDING";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute inset-x-1 z-[5] flex flex-col overflow-hidden rounded-lg px-2 py-1 text-left text-xs shadow-soft ring-1 transition hover:-translate-y-px hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        isNoShow
          ? "bg-tone-stone text-tone-stone-foreground ring-foreground/5"
          : session.isFirstVisit
            ? "bg-tone-peach text-tone-peach-foreground ring-tone-peach-foreground/15"
            : "bg-tone-sky text-tone-sky-foreground ring-tone-sky-foreground/15",
      )}
      style={{ top: top + 1, height: height - 2 }}
    >
      <span className="flex items-center gap-1 font-semibold tabular-nums">
        {minutesToTime(session.startMinute)}
        {isDone ? <Check className="size-3" aria-label="Realizada" /> : null}
        {owes ? <span className="size-1.5 rounded-full bg-tone-honey-foreground" title="Pagamento pendente" /> : null}
      </span>
      <span className={cn("truncate font-medium", isNoShow && "line-through")}>{session.patientName}</span>
      {height > 56 ? (
        <span className="truncate opacity-80">{isNoShow ? "Faltou" : session.typeName}</span>
      ) : null}
    </button>
  );
}
