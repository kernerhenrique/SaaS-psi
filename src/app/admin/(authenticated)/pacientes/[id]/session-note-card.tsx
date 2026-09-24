"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { FileText, NotebookPen, Pencil } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { formatFullDate } from "@/lib/date";
import { SESSION_STATUS_BADGE } from "@/lib/labels";
import type { PatientSessionDto } from "@/server/modules/patient/patient.service";

export function SessionNotesList({
  sessions,
  today,
  emptyText,
  onChanged,
}: {
  sessions: PatientSessionDto[];
  today: string;
  emptyText: string;
  onChanged: () => void;
}) {
  if (sessions.length === 0) {
    return <EmptyState title="Nenhuma consulta aqui ainda" description={emptyText} />;
  }
  return (
    <ul className="space-y-4">
      {sessions.map((s) => (
        <li key={s.id}>
          <SessionNoteCard session={s} today={today} onChanged={onChanged} />
        </li>
      ))}
    </ul>
  );
}

function SessionNoteCard({
  session,
  today,
  onChanged,
}: {
  session: PatientSessionDto;
  today: string;
  onChanged: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const isFuture = session.date > today;
  const canWrite = !isFuture && (session.status === "DONE" || session.status === "SCHEDULED");

  return (
    <article className="rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/5 sm:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">
            {formatFullDate(session.date)} <span className="font-normal text-muted-foreground">às {session.startTime}</span>
          </p>
          <p className="text-xs text-muted-foreground">{session.typeName}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={SESSION_STATUS_BADGE[session.status]} />
          {canWrite && session.note && !isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil />
                Editar
              </Button>
              <Link href={`/admin/relatorios/${session.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <FileText />
                Relatório
              </Link>
            </>
          ) : null}
        </div>
      </header>

      {session.status === "CANCELLED" ? (
        <p className="text-sm text-muted-foreground">Consulta cancelada.</p>
      ) : session.status === "NO_SHOW" ? (
        <p className="text-sm text-muted-foreground">O paciente faltou a esta consulta.</p>
      ) : isFuture ? (
        <p className="text-sm text-muted-foreground">
          Consulta marcada. As anotações ficam disponíveis a partir do dia do atendimento.
        </p>
      ) : isEditing ? (
        <NoteEditor session={session} onDone={() => setIsEditing(false)} onChanged={onChanged} />
      ) : session.note ? (
        <div className="grid gap-4 md:grid-cols-2">
          <NoteBlock title="O que os pais relataram" text={session.note.parentReport} />
          <NoteBlock title="Sessão com o paciente" text={session.note.patientSession} />
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-xl bg-muted/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Nenhuma anotação desta consulta ainda.</p>
          <Button onClick={() => setIsEditing(true)}>
            <NotebookPen />
            Escrever anotações
          </Button>
        </div>
      )}
    </article>
  );
}

function NoteBlock({ title, text }: { title: string; text: string | null }) {
  return (
    <section className="rounded-xl bg-muted/60 p-4">
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      <p className="text-sm whitespace-pre-line">{text ?? <span className="text-muted-foreground">Sem anotação.</span>}</p>
    </section>
  );
}

function NoteEditor({
  session,
  onDone,
  onChanged,
}: {
  session: PatientSessionDto;
  onDone: () => void;
  onChanged: () => void;
}) {
  const [parentReport, setParentReport] = useState(session.note?.parentReport ?? "");
  const [patientSession, setPatientSession] = useState(session.note?.patientSession ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const result = await apiRequest(`/api/admin/sessions/${session.id}/note`, "PUT", { parentReport, patientSession });
    setIsSaving(false);
    if (!result.ok) return setError(result.error);
    toast.success("Anotações salvas");
    onDone();
    onChanged();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`pr-${session.id}`}>O que os pais ou responsáveis relataram</Label>
          <Textarea
            id={`pr-${session.id}`}
            value={parentReport}
            onChange={(e) => setParentReport(e.target.value)}
            rows={7}
            className="min-h-40"
            placeholder="Como foi a semana, mudanças percebidas em casa ou na escola..."
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`ps-${session.id}`}>Como foi a sessão com o paciente</Label>
          <Textarea
            id={`ps-${session.id}`}
            value={patientSession}
            onChange={(e) => setPatientSession(e.target.value)}
            rows={7}
            className="min-h-40"
            placeholder="Atividades, brincadeiras, falas importantes, comportamento..."
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar anotações"}
        </Button>
      </div>
    </form>
  );
}
