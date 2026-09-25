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

type BlockKey = "parent" | "patient";
type Draft = { parentReport: string; patientSession: string; followUps: { text: string; selected: boolean }[] };

/**
 * Ditado após o atendimento: 1) a psicóloga dita os dois resumos;
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
  const [transcripts, setTranscripts] = useState<Record<BlockKey, string>>({ parent: "", patient: "" });
  const [listeningBlock, setListeningBlock] = useState<BlockKey | null>(null);
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

  function toggleMic(block: BlockKey) {
    if (listeningBlock) {
      handleRef.current?.stop();
      if (listeningBlock === block) return;
    }
    setError(null);
    setListeningBlock(block);
    handleRef.current = transcriptionProvider.start({
      onFinal: (text) => setTranscripts((prev) => ({ ...prev, [block]: appendTranscript(prev[block], text) })),
      onInterim: setInterim,
      onError: setError,
      onEnd: () => {
        setInterim("");
        setListeningBlock((current) => (current === block ? null : current));
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
    const result = await apiRequest<{ draft: { parentReport: string; patientSession: string; followUps: string[] } }>(
      `/api/admin/sessions/${sessionId}/organize`,
      "POST",
      { parentTranscript: transcripts.parent, patientTranscript: transcripts.patient },
    );
    setIsWorking(false);
    if (!result.ok) return setError(result.error);
    const d = result.data.draft;
    setDraft({
      parentReport: d.parentReport,
      patientSession: d.patientSession,
      followUps: d.followUps.map((text) => ({ text, selected: true })),
    });
  }

  function useWithoutAi() {
    stopListening();
    if (!transcripts.parent.trim() && !transcripts.patient.trim()) {
      return setError("Dite ou escreva pelo menos um dos dois resumos.");
    }
    setError(null);
    setDraft({ parentReport: transcripts.parent.trim(), patientSession: transcripts.patient.trim(), followUps: [] });
  }

  async function saveDraft() {
    if (!draft) return;
    setIsWorking(true);
    setError(null);
    const note = await apiRequest(`/api/admin/sessions/${sessionId}/note`, "PUT", {
      parentReport: draft.parentReport,
      patientSession: draft.patientSession,
    });
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
    toast.success("Anotações salvas no prontuário", {
      description: selected.length ? `${selected.length} ponto(s) adicionados para acompanhar.` : undefined,
    });
    onSaved();
  }

  const hasText = Boolean(transcripts.parent.trim() || transcripts.patient.trim());

  // ---- Etapa 2: revisão do rascunho --------------------------------------
  if (draft) {
    return (
      <div className="grid gap-4">
        <p className="rounded-xl bg-tone-honey/60 p-3 text-sm text-tone-honey-foreground">
          Rascunho pronto. <strong>Revise e corrija o que precisar</strong> — nada foi salvo ainda.
          {hasExistingNote ? " Ao salvar, este texto substitui a anotação atual desta consulta." : ""}
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`dr-parent-${sessionId}`}>O que os pais ou responsáveis relataram</Label>
            <Textarea
              id={`dr-parent-${sessionId}`}
              value={draft.parentReport}
              onChange={(e) => setDraft({ ...draft, parentReport: e.target.value })}
              className="min-h-40"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`dr-patient-${sessionId}`}>Como foi a sessão com o paciente</Label>
            <Textarea
              id={`dr-patient-${sessionId}`}
              value={draft.patientSession}
              onChange={(e) => setDraft({ ...draft, patientSession: e.target.value })}
              className="min-h-40"
            />
          </div>
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
          Dite depois do atendimento — a sessão em si não é gravada. {micAvailable ? transcriptionProvider.privacyNote : "Este navegador não tem reconhecimento de voz: digite os resumos (no Chrome, o microfone fica disponível)."}
          {aiEnabled ? " Ao organizar com IA, o texto é enviado à Anthropic (Claude) para ser reescrito." : ""}
        </span>
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <DictationBlock
          id={`dict-parent-${sessionId}`}
          label="1. O que os pais ou responsáveis relataram"
          hint="Resumo da conversa com a família."
          value={transcripts.parent}
          onChange={(value) => setTranscripts((prev) => ({ ...prev, parent: value }))}
          listening={listeningBlock === "parent"}
          interim={listeningBlock === "parent" ? interim : ""}
          micAvailable={micAvailable}
          onToggleMic={() => toggleMic("parent")}
        />
        <DictationBlock
          id={`dict-patient-${sessionId}`}
          label="2. Como foi a sessão com o paciente"
          hint="Atividades, falas importantes, comportamento, pontos a acompanhar."
          value={transcripts.patient}
          onChange={(value) => setTranscripts((prev) => ({ ...prev, patient: value }))}
          listening={listeningBlock === "patient"}
          interim={listeningBlock === "patient" ? interim : ""}
          micAvailable={micAvailable}
          onToggleMic={() => toggleMic("patient")}
        />
      </div>

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
