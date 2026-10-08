"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { FileText, Mic, NotebookPen, Pencil, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { ConfirmButton } from "@/components/confirm-button";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { formatFullDate } from "@/lib/date";
import { SESSION_STATUS_BADGE } from "@/lib/labels";
import type { PatientSessionDto } from "@/server/modules/patient/patient.service";

import { DictationPanel } from "./dictation-panel";

export function SessionNotesList({
  sessions,
  patientId,
  today,
  aiEnabled,
  emptyText,
  onChanged,
}: {
  sessions: PatientSessionDto[];
  patientId: string;
  today: string;
  aiEnabled: boolean;
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
          <SessionNoteCard session={s} patientId={patientId} today={today} aiEnabled={aiEnabled} onChanged={onChanged} />
        </li>
      ))}
    </ul>
  );
}

type CardMode = "view" | "edit" | "dictate";

function SessionNoteCard({
  session,
  patientId,
  today,
  aiEnabled,
  onChanged,
}: {
  session: PatientSessionDto;
  patientId: string;
  today: string;
  aiEnabled: boolean;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<CardMode>("view");
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
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={SESSION_STATUS_BADGE[session.status]} />
          {canWrite && session.note && mode === "view" ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setMode("dictate")}>
                <Mic />
                Ditar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMode("edit")}>
                <Pencil />
                Editar
              </Button>
              <Link href={`/admin/relatorios/${session.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <FileText />
                Relatório
              </Link>
            </>
          ) : null}
          {session.status === "SCHEDULED" ? (
            <ConfirmButton
              label="Cancelar consulta"
              icon={<XCircle />}
              onConfirm={async () => {
                const result = await apiRequest(`/api/admin/sessions/${session.id}/status`, "PATCH", { status: "CANCELLED" });
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Consulta cancelada");
                onChanged();
              }}
            />
          ) : null}
          {!session.note?.content ? (
            <ConfirmButton
              label="Excluir consulta"
              icon={<Trash2 />}
              onConfirm={async () => {
                const result = await apiRequest(`/api/admin/sessions/${session.id}`, "DELETE");
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Consulta excluída");
                onChanged();
              }}
            />
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
      ) : mode === "dictate" ? (
        <DictationPanel
          sessionId={session.id}
          patientId={patientId}
          aiEnabled={aiEnabled}
          hasExistingNote={Boolean(session.note)}
          onCancel={() => setMode("view")}
          onSaved={() => {
            setMode("view");
            onChanged();
          }}
        />
      ) : mode === "edit" ? (
        <NoteEditor session={session} onDone={() => setMode("view")} onChanged={onChanged} />
      ) : session.note ? (
        <NoteBlock text={session.note.content} />
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-xl bg-muted/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Nenhuma anotação desta consulta ainda.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setMode("edit")}>
              <NotebookPen />
              Escrever anotações
            </Button>
            <Button onClick={() => setMode("dictate")}>
              <Mic />
              Ditar anotações
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

function NoteBlock({ text }: { text: string | null }) {
  return (
    <section className="rounded-xl bg-muted/60 p-4">
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
  const [content, setContent] = useState(session.note?.content ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const result = await apiRequest(`/api/admin/sessions/${session.id}/note`, "PUT", { content });
    setIsSaving(false);
    if (!result.ok) return setError(result.error);
    toast.success("Anotação salva");
    onDone();
    onChanged();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor={`note-${session.id}`}>Anotação da consulta</Label>
        <Textarea
          id={`note-${session.id}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          className="min-h-56"
          placeholder="Como foi a semana, mudanças percebidas em casa ou na escola, atividades da sessão, comportamento, falas importantes..."
        />
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
          {isSaving ? "Salvando..." : "Salvar anotação"}
        </Button>
      </div>
    </form>
  );
}
