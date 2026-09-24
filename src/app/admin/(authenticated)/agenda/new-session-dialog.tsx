"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";

import { PatientAvatar } from "@/components/patient-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { apiRequest } from "@/lib/api-client";
import { centsToInput, formatPriceFromCents, inputToCents } from "@/lib/currency";
import type { AgendaOptions } from "@/server/modules/session/session.service";

import { PatientFormDialog } from "../pacientes/patient-form-dialog";

export type NewSessionDraft = { date: string; time: string; patientId?: string };

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function NewSessionDialog({
  draft,
  options,
  onClose,
}: {
  /** `null` = fechado. */
  draft: NewSessionDraft | null;
  options: AgendaOptions;
  onClose: () => void;
}) {
  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">Nova consulta</DialogTitle>
          <DialogDescription>Escolha o paciente, o tipo e o horário combinados com a família.</DialogDescription>
        </DialogHeader>
        {draft ? <NewSessionForm draft={draft} options={options} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function NewSessionForm({
  draft,
  options,
  onClose,
}: {
  draft: NewSessionDraft;
  options: AgendaOptions;
  onClose: () => void;
}) {
  const router = useRouter();
  const [patientId, setPatientId] = useState<string | null>(draft.patientId ?? null);
  const [search, setSearch] = useState("");
  const [typeId, setTypeId] = useState<string | null>(null);
  const [date, setDate] = useState(draft.date);
  const [time, setTime] = useState(draft.time);
  const [duration, setDuration] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const patient = options.patients.find((p) => p.id === patientId) ?? null;
  const firstVisitType = options.sessionTypes.find((t) => t.isFirstVisit);
  const returnType = options.sessionTypes.find((t) => !t.isFirstVisit);
  // Sugestão automática: quem nunca teve consulta faz a primeira; os demais, retorno.
  const suggestedType = patient ? (patient.hasSessions ? returnType : firstVisitType) : null;
  const selectedType = options.sessionTypes.find((t) => t.id === typeId) ?? suggestedType ?? null;
  const durationValue = duration ?? String(selectedType?.durationMin ?? 50);
  const amountValue = amount ?? (selectedType ? centsToInput(selectedType.priceCents) : "");

  const matches = useMemo(() => {
    const q = normalize(search.trim());
    return q ? options.patients.filter((p) => normalize(p.fullName).includes(q)) : options.patients;
  }, [options.patients, search]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patientId) return setError("Escolha o paciente.");
    if (!selectedType) return setError("Escolha o tipo de consulta.");
    const amountCents = inputToCents(amountValue);
    if (amountCents === null) return setError("Valor inválido. Use por exemplo 200 ou 180,50.");

    setIsSaving(true);
    const result = await apiRequest("/api/admin/sessions", "POST", {
      patientId,
      sessionTypeId: selectedType.id,
      date,
      startTime: time,
      durationMin: Number(durationValue),
      amountCents,
    });
    setIsSaving(false);
    if (!result.ok) return setError(result.error);

    toast.success("Consulta marcada", { description: `${patient?.fullName ?? "Paciente"} · ${date.split("-").reverse().join("/")} às ${time}` });
    onClose();
    // Leva para a semana da consulta (caso a data tenha sido trocada) e recarrega os dados.
    router.push(`/admin/agenda?data=${date}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="patient-search">Paciente</Label>
        {patient ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <PatientAvatar name={patient.fullName} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{patient.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {patient.hasSessions ? "Já é paciente" : "Ainda não teve consulta"}
                </p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPatientId(null)}>
              Trocar
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="patient-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Digite o nome do paciente"
                className="pl-9"
                autoFocus
                autoComplete="off"
              />
            </div>
            <ul className="max-h-48 overflow-y-auto rounded-xl ring-1 ring-input" role="listbox" aria-label="Pacientes">
              {matches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      setPatientId(p.id);
                      setTypeId(null);
                      setAmount(null);
                      setDuration(null);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <PatientAvatar name={p.fullName} size="sm" />
                    {p.fullName}
                  </button>
                </li>
              ))}
              {matches.length === 0 ? (
                <li className="px-3 py-3 text-sm text-muted-foreground">Nenhum paciente com esse nome.</li>
              ) : null}
            </ul>
            <PatientFormDialog
              trigger={
                <Button type="button" variant="outline" size="sm" className="justify-self-start">
                  <UserPlus />
                  Cadastrar novo paciente
                </Button>
              }
              onSaved={(id) => {
                setPatientId(id);
                router.refresh();
              }}
            />
          </>
        )}
      </div>

      <div className="grid gap-2">
        <Label>Tipo de consulta</Label>
        <Segmented
          label="Tipo de consulta"
          value={selectedType?.id ?? null}
          onChange={(id) => {
            setTypeId(id);
            setAmount(null);
            setDuration(null);
          }}
          options={options.sessionTypes.map((t) => ({
            value: t.id,
            label: (
              <span className="inline-flex items-center gap-1.5">
                {t.name}
                {suggestedType?.id === t.id && !typeId ? <Check className="size-3.5" /> : null}
              </span>
            ),
            hint: formatPriceFromCents(t.priceCents),
          }))}
        />
        {suggestedType && !typeId ? (
          <p className="text-xs text-muted-foreground">Sugerido pelo histórico do paciente. Você pode trocar.</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 grid gap-1.5">
          <Label htmlFor="session-date">Data</Label>
          <Input id="session-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="session-time">Horário</Label>
          <Input id="session-time" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="session-duration">Duração (min)</Label>
          <Input
            id="session-duration"
            type="number"
            min={10}
            max={240}
            step={5}
            value={durationValue}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-1.5 sm:max-w-40">
        <Label htmlFor="session-amount">Valor (R$)</Label>
        <Input
          id="session-amount"
          inputMode="decimal"
          value={amountValue}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="200,00"
        />
      </div>

      {error ? (
        <p role="alert" className={cn("rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive")}>
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Marcando..." : "Marcar consulta"}
        </Button>
      </DialogFooter>
    </form>
  );
}
