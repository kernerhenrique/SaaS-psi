"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Info, Sparkles, Type } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";

import { DictationBlock } from "@/components/dictation-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { appendTranscript, transcriptionProvider } from "@/lib/transcription";
import type { TranscriptionHandle } from "@/lib/transcription/types";

type Draft = { content: string; followUps: { text: string; selected: boolean }[] };

/**
 * Ditado após o atendimento: 1) a psicóloga dita a anotação da consulta;
 * 2) a IA organiza (ou ela segue sem IA); 3) revisa e salva no prontuário.
 * Nenhum áudio é gravado — só o texto chega ao sistema.
 */
export function DictationPanel({
  sessionId,
  patientId,
  aiEnabled,
  hasExistingNote,
  onCancel,
  onSaved,
}: {
  sessionId: string;
  patientId: string;
  aiEnabled: boolean;
  hasExistingNote: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [micAvailable, setMicAvailable] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<TranscriptionHandle | null>(null);

  useEffect(() => {
    // Só dá para saber se o navegador tem reconhecimento de voz depois de montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMicAvailable(transcriptionProvider.isSupported());
    return () => handleRef.current?.stop();
  }, []);

  function toggleMic() {
    if (listening) {
      handleRef.current?.stop();
      return;
    }
    setError(null);
    setListening(true);
    handleRef.current = transcriptionProvider.start({
      onFinal: (text) => setTranscript((prev) => appendTranscript(prev, text)),
      onInterim: setInterim,
      onError: setError,
      onEnd: () => {
        setInterim("");
        setListening(false);
      },
    });
  }

  function stopListening() {
    handleRef.current?.stop();
  }

  async function organizeWithAi() {
    stopListening();
    setIsWorking(true);
    setError(null);
    const result = await apiRequest<{ draft: { content: string; followUps: string[] } }>(
      `/api/admin/sessions/${sessionId}/organize`,
      "POST",
      { transcript },
    );
    setIsWorking(false);
    if (!result.ok) return setError(result.error);
    const d = result.data.draft;
    setDraft({ content: d.content, followUps: d.followUps.map((text) => ({ text, selected: true })) });
  }

  function useWithoutAi() {
    stopListening();
    if (!transcript.trim()) {
      return setError("Dite ou escreva a anotação antes de continuar.");
    }
    setError(null);
    setDraft({ content: transcript.trim(), followUps: [] });
  }

  async function saveDraft() {
    if (!draft) return;
    setIsWorking(true);
    setError(null);
    const note = await apiRequest(`/api/admin/sessions/${sessionId}/note`, "PUT", { content: draft.content });
    if (!note.ok) {
      setIsWorking(false);
      return setError(note.error);
    }
    const selected = draft.followUps.filter((f) => f.selected && f.text.trim());
    for (const item of selected) {
      const res = await apiRequest(`/api/admin/patients/${patientId}/follow-ups`, "POST", { text: item.text });
      if (!res.ok) toast.error(`Não foi possível salvar “${item.text}”: ${res.error}`);
    }
    setIsWorking(false);
    toast.success("Anotação salva no prontuário", {
      description: selected.length ? `${selected.length} ponto(s) adicionados para acompanhar.` : undefined,
    });
    onSaved();
  }

  const hasText = Boolean(transcript.trim());

  // ---- Etapa 2: revisão do rascunho --------------------------------------
  if (draft) {
    return (
      <div className="grid gap-4">
        <p className="rounded-xl bg-tone-honey/60 p-3 text-sm text-tone-honey-foreground">
          Rascunho pronto. <strong>Revise e corrija o que precisar</strong> — nada foi salvo ainda.
          {hasExistingNote ? " Ao salvar, este texto substitui a anotação atual desta consulta." : ""}
        </p>
        <div className="grid gap-1.5">
          <Label htmlFor={`dr-content-${sessionId}`}>Anotação da consulta</Label>
          <Textarea
            id={`dr-content-${sessionId}`}
            value={draft.content}
            onChange={(e) => setDraft({ ...draft, content: e.target.value })}
            rows={10}
            className="min-h-56"
          />
        </div>

        {draft.followUps.length ? (
          <fieldset className="grid gap-2 rounded-xl bg-muted/50 p-3">
            <legend className="px-1 text-sm font-semibold">Para acompanhar na próxima sessão</legend>
            <p className="text-xs text-muted-foreground">Desmarque o que não quiser guardar. Você pode editar o texto.</p>
            {draft.followUps.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={item.selected}
                  aria-label={`Guardar: ${item.text}`}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      followUps: draft.followUps.map((f, i) => (i === index ? { ...f, selected: !f.selected } : f)),
                    })
                  }
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition",
                    item.selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                  )}
                >
                  {item.selected ? <Check className="size-3.5" /> : null}
                </button>
                <Input
                  value={item.text}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      followUps: draft.followUps.map((f, i) => (i === index ? { ...f, text: e.target.value } : f)),
                    })
                  }
                  className="h-9 bg-card"
                />
              </div>
            ))}
          </fieldset>
        ) : null}

        {error ? <ErrorMessage text={error} /> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => setDraft(null)} disabled={isWorking}>
            Voltar ao ditado
          </Button>
          <Button type="button" onClick={saveDraft} disabled={isWorking}>
            {isWorking ? "Salvando..." : "Salvar no prontuário"}
          </Button>
        </div>
      </div>
    );
  }

  // ---- Etapa 1: ditado ---------------------------------------------------
  return (
    <div className="grid gap-4">
      <p className="flex gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          Dite depois do atendimento — a sessão em si não é gravada. {micAvailable ? transcriptionProvider.privacyNote : "Este navegador não tem reconhecimento de voz: digite a anotação (no Chrome, o microfone fica disponível)."}
          {aiEnabled ? " Ao organizar com IA, o texto é enviado à Anthropic (Claude) para ser reescrito." : ""}
        </span>
      </p>

      <DictationBlock
        id={`dict-${sessionId}`}
        label="Anotação da consulta"
        hint="O que os pais relataram, como foi a sessão, atividades, falas importantes, comportamento..."
        value={transcript}
        onChange={setTranscript}
        listening={listening}
        interim={interim}
        micAvailable={micAvailable}
        onToggleMic={toggleMic}
      />

      {error ? <ErrorMessage text={error} /> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isWorking}>
          Cancelar
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={useWithoutAi} disabled={isWorking || !hasText}>
            <Type />
            Usar o texto sem IA
          </Button>
          <Button
            type="button"
            onClick={organizeWithAi}
            disabled={isWorking || !hasText || !aiEnabled}
            title={aiEnabled ? undefined : "A IA ainda não foi configurada (falta a chave da Anthropic)."}
          >
            <Sparkles />
            {isWorking ? "Organizando..." : "Organizar com IA"}
          </Button>
        </div>
      </div>
      {!aiEnabled ? (
        <p className="text-right text-xs text-muted-foreground">
          A organização por IA fica disponível quando a chave da Anthropic for configurada.
        </p>
      ) : null}
    </div>
  );
}

function ErrorMessage({ text }: { text: string }) {
  return (
    <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {text}
    </p>
  );
}
