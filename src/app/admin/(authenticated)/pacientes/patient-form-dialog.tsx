"use client";

import { useState, type FormEvent } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { RELATIONSHIP_SUGGESTIONS } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";

export type PatientFormValues = {
  fullName: string;
  birthDate: string | null;
  healthInfo: string | null;
  notes: string | null;
  guardians: { name: string; relationship: string; phone: string | null; email: string | null; isPrimary: boolean }[];
};

type GuardianDraft = { key: number; name: string; relationship: string; phone: string; email: string };

let nextKey = 0;
const emptyGuardian = (): GuardianDraft => ({ key: nextKey++, name: "", relationship: "", phone: "", email: "" });

/**
 * Cadastro e edição dos dados fixos do paciente + responsáveis.
 * Sem `patientId` cria um paciente novo; com ele, edita o existente.
 */
export function PatientFormDialog({
  trigger,
  patientId,
  initialValues,
  onSaved,
}: {
  trigger: React.ReactElement;
  patientId?: string;
  initialValues?: PatientFormValues;
  onSaved: (patientId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isEditing = Boolean(patientId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">
            {isEditing ? "Editar dados do paciente" : "Novo paciente"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Altere o que precisar e salve."
              : "Só o nome é obrigatório. O resto você pode completar depois."}
          </DialogDescription>
        </DialogHeader>
        {/* Só monta o formulário enquanto o diálogo está aberto: cada abertura
            começa com os valores atuais, sem sobras de uma edição cancelada. */}
        {open ? (
          <PatientFormFields
            patientId={patientId}
            initialValues={initialValues}
            onClose={() => setOpen(false)}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PatientFormFields({
  patientId,
  initialValues,
  onClose,
  onSaved,
}: {
  patientId?: string;
  initialValues?: PatientFormValues;
  onClose: () => void;
  onSaved: (patientId: string) => void;
}) {
  const [fullName, setFullName] = useState(initialValues?.fullName ?? "");
  const [birthDate, setBirthDate] = useState(initialValues?.birthDate ?? "");
  const [healthInfo, setHealthInfo] = useState(initialValues?.healthInfo ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [guardians, setGuardians] = useState<GuardianDraft[]>(() =>
    initialValues?.guardians.length
      ? initialValues.guardians.map((g) => ({
          key: nextKey++,
          name: g.name,
          relationship: g.relationship,
          phone: g.phone ? formatPhone(g.phone) : "",
          email: g.email ?? "",
        }))
      : [emptyGuardian()],
  );
  const [primaryKey, setPrimaryKey] = useState<number | null>(() => {
    const index = initialValues?.guardians.findIndex((g) => g.isPrimary) ?? -1;
    return index >= 0 ? guardians[index]?.key ?? null : guardians[0]?.key ?? null;
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateGuardian(key: number, field: keyof Omit<GuardianDraft, "key">, value: string) {
    setGuardians((prev) => prev.map((g) => (g.key === key ? { ...g, [field]: value } : g)));
  }

  function removeGuardian(key: number) {
    setGuardians((prev) => prev.filter((g) => g.key !== key));
    if (primaryKey === key) setPrimaryKey(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Linhas de responsável totalmente vazias são ignoradas (ex.: o campo em branco inicial).
    const filled = guardians.filter((g) => g.name.trim() || g.relationship.trim() || g.phone.trim() || g.email.trim());
    const payload = {
      fullName,
      birthDate: birthDate || null,
      healthInfo,
      notes,
      guardians: filled.map((g) => ({
        name: g.name,
        relationship: g.relationship,
        phone: g.phone || null,
        email: g.email || null,
        isPrimary: g.key === primaryKey,
      })),
    };

    setIsSubmitting(true);
    const result = patientId
      ? await apiRequest(`/api/admin/patients/${patientId}`, "PATCH", payload)
      : await apiRequest<{ patient: { id: string } }>("/api/admin/patients", "POST", payload);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(patientId ? "Dados atualizados" : "Paciente cadastrado");
    onClose();
    const savedId = patientId ?? (result.data as { patient: { id: string } }).patient.id;
    onSaved(savedId);
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
      <section className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="fullName">Nome completo do paciente</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ex.: Lucas Almeida"
            autoFocus
            required
          />
        </div>
        <div className="grid gap-1.5 sm:max-w-56">
          <Label htmlFor="birthDate">Data de nascimento</Label>
          <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          <p className="text-xs text-muted-foreground">A idade é calculada automaticamente.</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="healthInfo">Informações importantes de saúde</Label>
          <Textarea
            id="healthInfo"
            value={healthInfo}
            onChange={(e) => setHealthInfo(e.target.value)}
            placeholder="Alergias, medicamentos, diagnósticos, outros profissionais que acompanham..."
            rows={3}
            className="min-h-24"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="notes">Outras observações</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Escola, com quem mora, rotina..."
            rows={2}
          />
        </div>
      </section>

      <section className="grid gap-3">
        <div>
          <h3 className="text-sm font-semibold">Pais ou responsáveis</h3>
          <p className="text-xs text-muted-foreground">
            A estrela marca quem recebe as mensagens de WhatsApp (lembretes e cobranças).
          </p>
        </div>

        <datalist id="relationship-suggestions">
          {RELATIONSHIP_SUGGESTIONS.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>

        {guardians.map((g, index) => {
          const isPrimary = g.key === primaryKey;
          return (
            <div key={g.key} className="grid gap-3 rounded-xl bg-muted/60 p-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor={`g-name-${g.key}`}>Nome</Label>
                <Input
                  id={`g-name-${g.key}`}
                  value={g.name}
                  onChange={(e) => updateGuardian(g.key, "name", e.target.value)}
                  placeholder="Ex.: Carla Almeida"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`g-rel-${g.key}`}>Parentesco</Label>
                <Input
                  id={`g-rel-${g.key}`}
                  list="relationship-suggestions"
                  value={g.relationship}
                  onChange={(e) => updateGuardian(g.key, "relationship", e.target.value)}
                  placeholder="Mãe, pai, avó..."
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`g-phone-${g.key}`}>WhatsApp</Label>
                <Input
                  id={`g-phone-${g.key}`}
                  type="tel"
                  inputMode="tel"
                  value={g.phone}
                  onChange={(e) => updateGuardian(g.key, "phone", e.target.value)}
                  onBlur={(e) => updateGuardian(g.key, "phone", formatPhone(e.target.value))}
                  placeholder="(27) 99999-9999"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`g-email-${g.key}`}>E-mail (opcional)</Label>
                <Input
                  id={`g-email-${g.key}`}
                  type="email"
                  value={g.email}
                  onChange={(e) => updateGuardian(g.key, "email", e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between gap-2 sm:col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPrimaryKey(g.key)}
                  aria-pressed={isPrimary}
                  className={cn(isPrimary && "text-tone-honey-foreground")}
                >
                  <Star className={cn(isPrimary && "fill-current")} />
                  {isPrimary ? "Recebe as mensagens" : "Usar para as mensagens"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeGuardian(g.key)}
                  aria-label={`Remover ${index + 1}º responsável`}
                >
                  <Trash2 />
                  Remover
                </Button>
              </div>
            </div>
          );
        })}

        {guardians.length < 5 ? (
          <Button
            type="button"
            variant="outline"
            className="justify-self-start"
            onClick={() => {
              const g = emptyGuardian();
              setGuardians((prev) => [...prev, g]);
              if (primaryKey === null) setPrimaryKey(g.key);
            }}
          >
            <Plus />
            Adicionar responsável
          </Button>
        ) : null}
      </section>

      {error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
