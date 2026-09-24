"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { formatFullDate } from "@/lib/date";

import { ConfirmButton } from "@/components/confirm-button";

type ParentNote = { id: string; date: string; content: string };

export function ParentNotesPanel({
  patientId,
  notes,
  today,
  onChanged,
}: {
  patientId: string;
  notes: ParentNote[];
  today: string;
  onChanged: () => void;
}) {
  const [isAdding, setIsAdding] = useState(notes.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function archive(id: string) {
    const result = await apiRequest(`/api/admin/parent-notes/${id}`, "DELETE");
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Anotação removida");
    onChanged();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Registre aqui as conversas com os pais ou responsáveis — normalmente a primeira acontece antes do
        atendimento da criança.
      </p>

      {isAdding ? (
        <NoteForm
          today={today}
          submitLabel="Salvar anotação"
          onCancel={notes.length ? () => setIsAdding(false) : undefined}
          onSubmit={async (values) => {
            const result = await apiRequest(`/api/admin/patients/${patientId}/parent-notes`, "POST", values);
            if (!result.ok) return result.error;
            toast.success("Anotação salva");
            setIsAdding(false);
            onChanged();
            return null;
          }}
        />
      ) : (
        <Button variant="outline" onClick={() => setIsAdding(true)}>
          <Plus />
          Nova conversa com os pais
        </Button>
      )}

      {notes.length === 0 && !isAdding ? (
        <EmptyState title="Nenhuma conversa registrada" />
      ) : (
        <ul className="space-y-3">
          {notes.map((note) =>
            editingId === note.id ? (
              <li key={note.id}>
                <NoteForm
                  today={today}
                  initial={note}
                  submitLabel="Salvar alterações"
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (values) => {
                    const result = await apiRequest(`/api/admin/parent-notes/${note.id}`, "PATCH", values);
                    if (!result.ok) return result.error;
                    toast.success("Anotação atualizada");
                    setEditingId(null);
                    onChanged();
                    return null;
                  }}
                />
              </li>
            ) : (
              <li key={note.id} className="rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{formatFullDate(note.date)}</p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(note.id)}>
                      <Pencil />
                      Editar
                    </Button>
                    <ConfirmButton onConfirm={() => archive(note.id)} icon={<Trash2 />} label="Remover" />
                  </div>
                </div>
                <p className="text-sm whitespace-pre-line">{note.content}</p>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function NoteForm({
  today,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  today: string;
  initial?: ParentNote;
  submitLabel: string;
  /** Devolve a mensagem de erro, ou `null` se salvou. */
  onSubmit: (values: { date: string; content: string }) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [date, setDate] = useState(initial?.date ?? today);
  const [content, setContent] = useState(initial?.content ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(await onSubmit({ date, content }));
    setIsSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl bg-card p-5 shadow-soft ring-1 ring-primary/20">
      <div className="grid gap-1.5 sm:max-w-48">
        <Label htmlFor={`pn-date-${initial?.id ?? "new"}`}>Data da conversa</Label>
        <Input
          id={`pn-date-${initial?.id ?? "new"}`}
          type="date"
          max={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`pn-content-${initial?.id ?? "new"}`}>O que os pais ou responsáveis contaram</Label>
        <Textarea
          id={`pn-content-${initial?.id ?? "new"}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="min-h-36"
          placeholder="Motivo da procura, histórico, rotina da criança, expectativas da família..."
        />
      </div>
      {error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
