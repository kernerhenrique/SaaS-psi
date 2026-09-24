"use client";

import { useState, type FormEvent } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api-client";

import { ConfirmButton } from "./confirm-button";

type FollowUp = { id: string; text: string; doneAt: string | null; createdAt: string };

export function FollowUpsPanel({
  patientId,
  items,
  onChanged,
}: {
  patientId: string;
  items: FollowUp[];
  onChanged: () => void;
}) {
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const open = items.filter((i) => !i.doneAt);
  const done = items.filter((i) => i.doneAt);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const result = await apiRequest(`/api/admin/patients/${patientId}/follow-ups`, "POST", { text });
    setIsSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setText("");
    toast.success("Adicionado para acompanhar");
    onChanged();
  }

  async function toggle(item: FollowUp) {
    const result = await apiRequest(`/api/admin/follow-ups/${item.id}`, "PATCH", { done: !item.doneAt });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(item.doneAt ? "Voltou para a lista" : "Marcado como resolvido");
    onChanged();
  }

  async function remove(item: FollowUp) {
    const result = await apiRequest(`/api/admin/follow-ups/${item.id}`, "DELETE");
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Removido");
    onChanged();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Pontos para lembrar na próxima sessão. Eles também aparecem na tela inicial no dia da consulta.
      </p>

      <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex.: verificar se melhorou o sono"
          className="h-10 rounded-xl bg-card"
          aria-label="Novo ponto para acompanhar"
        />
        <Button type="submit" className="h-10 rounded-xl px-4" disabled={isSaving || !text.trim()}>
          <Plus />
          Adicionar
        </Button>
      </form>

      {open.length === 0 ? (
        <p className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">Nada pendente para este paciente.</p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {open.map((item) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-soft ring-1 ring-foreground/5"
              >
                <CheckCircle checked={false} onClick={() => toggle(item)} label={item.text} />
                <p className="flex-1 text-sm">{item.text}</p>
                <ConfirmButton label="Remover" icon={<Trash2 />} onConfirm={() => remove(item)} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {done.length > 0 ? (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground select-none hover:text-foreground">
            Resolvidos ({done.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {done.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                <CheckCircle checked onClick={() => toggle(item)} label={item.text} />
                <p className="flex-1 text-sm text-muted-foreground line-through">{item.text}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function CheckCircle({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      aria-label={checked ? `Reabrir: ${label}` : `Marcar como resolvido: ${label}`}
      title={checked ? "Reabrir" : "Marcar como resolvido"}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        checked ? "border-primary bg-primary text-primary-foreground" : "border-input hover:border-primary",
      )}
    >
      {checked ? <Check className="size-3.5" /> : null}
    </button>
  );
}
