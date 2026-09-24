"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, FileText, RotateCcw, UserX, Wallet, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";

import { CopyMessageButton } from "@/components/copy-message-button";
import { PatientAvatar } from "@/components/patient-avatar";
import { PaymentForm, type PaymentValues } from "@/components/payment-form";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { formatPriceFromCents } from "@/lib/currency";
import { formatDateLabel, minutesToTime } from "@/lib/date";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_BADGE, SESSION_STATUS_BADGE } from "@/lib/labels";
import { renderMessageTemplate } from "@/lib/message-template";
import type { SessionStatus } from "@/generated/prisma/enums";
import type { AgendaSession } from "@/server/modules/session/session.service";

import { ConfirmButton } from "@/components/confirm-button";

type Mode = "view" | "finish" | "payment" | "reschedule";

function firstName(name: string | null): string {
  return name?.split(" ")[0] ?? "";
}

export function SessionDetailsDialog({
  session,
  today,
  timezone,
  reminderTemplate,
  onClose,
}: {
  session: AgendaSession | null;
  today: string;
  timezone: string;
  reminderTemplate: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={session !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {session ? (
          <SessionDetails
            key={session.id}
            session={session}
            today={today}
            timezone={timezone}
            reminderTemplate={reminderTemplate}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SessionDetails({
  session,
  today,
  timezone,
  reminderTemplate,
  onClose,
}: {
  session: AgendaSession;
  today: string;
  timezone: string;
  reminderTemplate: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("view");
  const dateLabel = formatDateLabel(session.date, timezone);
  const timeLabel = `${minutesToTime(session.startMinute)} às ${minutesToTime(session.endMinute)}`;

  async function changeStatus(status: SessionStatus, successMessage: string, undo?: SessionStatus) {
    const result = await apiRequest(`/api/admin/sessions/${session.id}/status`, "PATCH", { status });
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(successMessage, {
      action: undo
        ? {
            label: "Desfazer",
            onClick: async () => {
              const back = await apiRequest(`/api/admin/sessions/${session.id}/status`, "PATCH", { status: undo });
              if (!back.ok) toast.error(back.error);
              router.refresh();
            },
          }
        : undefined,
    });
    router.refresh();
    return true;
  }

  async function savePayment(values: PaymentValues): Promise<string | null> {
    const result = await apiRequest(`/api/admin/sessions/${session.id}/payment`, "PATCH", values);
    return result.ok ? null : result.error;
  }

  const reminder = renderMessageTemplate(reminderTemplate, {
    responsavel: firstName(session.guardianName),
    nomePaciente: firstName(session.patientName),
    data: `${dateLabel.split(",")[0]} (${session.date.slice(8)}/${session.date.slice(5, 7)})`,
    hora: minutesToTime(session.startMinute),
  });

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <PatientAvatar name={session.patientName} />
          <div className="min-w-0">
            <DialogTitle className="truncate font-display text-2xl font-medium">{session.patientName}</DialogTitle>
            <DialogDescription className="first-letter:uppercase">
              {dateLabel} · {timeLabel}
            </DialogDescription>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <StatusBadge status={session.isFirstVisit ? "first-visit" : "return-visit"} />
          <StatusBadge status={SESSION_STATUS_BADGE[session.status]} />
          {session.status === "DONE" ? <StatusBadge status={PAYMENT_STATUS_BADGE[session.paymentStatus]} /> : null}
        </div>
      </DialogHeader>

      {mode === "finish" ? (
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Consulta realizada. Registre o pagamento agora ou deixe como pendente para depois.
          </p>
          <PaymentForm
            initial={{ paymentStatus: "PENDING", paymentMethod: null, paidAt: null, amountCents: session.amountCents }}
            today={today}
            submitLabel="Concluir consulta"
            onCancel={() => setMode("view")}
            onSubmit={async (values) => {
              const status = await apiRequest(`/api/admin/sessions/${session.id}/status`, "PATCH", { status: "DONE" });
              if (!status.ok) return status.error;
              const error = await savePayment(values);
              if (error) return error;
              toast.success("Consulta concluída", {
                description: values.paymentStatus === "PAID" ? "Pagamento registrado." : "Pagamento fica como pendente.",
              });
              onClose();
              router.refresh();
              return null;
            }}
          />
        </div>
      ) : mode === "payment" ? (
        <PaymentForm
          initial={session}
          today={today}
          onCancel={() => setMode("view")}
          onSubmit={async (values) => {
            const error = await savePayment(values);
            if (error) return error;
            toast.success("Pagamento atualizado");
            onClose();
            router.refresh();
            return null;
          }}
        />
      ) : mode === "reschedule" ? (
        <RescheduleForm session={session} onCancel={() => setMode("view")} onDone={onClose} />
      ) : (
        <div className="grid gap-5">
          {session.status === "SCHEDULED" ? (
            <div className="grid gap-2">
              <Button size="lg" className="h-11 rounded-xl" onClick={() => setMode("finish")}>
                <CheckCircle2 />
                Marcar como realizada
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={async () => (await changeStatus("NO_SHOW", "Falta registrada", "SCHEDULED")) && onClose()}
                >
                  <UserX />
                  Faltou
                </Button>
                <Button variant="outline" className="h-10 rounded-xl" onClick={() => setMode("reschedule")}>
                  <CalendarClock />
                  Remarcar
                </Button>
              </div>
            </div>
          ) : null}

          {session.status === "DONE" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/60 p-3">
              <div className="text-sm">
                <p className="font-medium">{formatPriceFromCents(session.amountCents)}</p>
                <p className="text-xs text-muted-foreground">
                  {session.paymentStatus === "PAID"
                    ? `Recebido${session.paymentMethod ? ` via ${PAYMENT_METHOD_LABELS[session.paymentMethod]}` : ""}${
                        session.paidAt ? ` em ${session.paidAt.split("-").reverse().join("/")}` : ""
                      }`
                    : session.paymentStatus === "PENDING"
                      ? "Aguardando pagamento"
                      : "Não vai pagar"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setMode("payment")}>
                <Wallet />
                {session.paymentStatus === "PAID" ? "Alterar pagamento" : "Registrar pagamento"}
              </Button>
            </div>
          ) : null}

          {session.status === "NO_SHOW" ? (
            <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
              Falta registrada. O pagamento ficou como “Não vai pagar” — altere no Financeiro se for cobrar.
            </p>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            {session.status === "SCHEDULED" ? (
              <CopyMessageButton message={reminder} label="Copiar lembrete" className="h-10 rounded-xl" />
            ) : null}
            <Link href={`/admin/pacientes/${session.patientId}`} className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-xl")}>
              <FileText />
              {session.status === "DONE" && !session.hasNote ? "Escrever anotações" : "Abrir ficha"}
            </Link>
          </div>

          <div className="flex flex-wrap justify-end gap-1 border-t pt-3">
            {session.status === "SCHEDULED" ? (
              <ConfirmButton
                label="Cancelar consulta"
                icon={<XCircle />}
                onConfirm={async () => {
                  if (await changeStatus("CANCELLED", "Consulta cancelada", "SCHEDULED")) onClose();
                }}
              />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => (await changeStatus("SCHEDULED", "Consulta reaberta como agendada")) && onClose()}
              >
                <RotateCcw />
                {session.status === "NO_SHOW" ? "Desfazer falta" : "Voltar para agendada"}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function RescheduleForm({
  session,
  onCancel,
  onDone,
}: {
  session: AgendaSession;
  onCancel: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [date, setDate] = useState(session.date);
  const [time, setTime] = useState(minutesToTime(session.startMinute));
  const [duration, setDuration] = useState(String(session.endMinute - session.startMinute));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const result = await apiRequest(`/api/admin/sessions/${session.id}`, "PATCH", {
      date,
      startTime: time,
      durationMin: Number(duration),
    });
    setIsSaving(false);
    if (!result.ok) return setError(result.error);
    toast.success("Consulta remarcada");
    onDone();
    router.push(`/admin/agenda?data=${date}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <p className="text-sm text-muted-foreground">Escolha o novo dia e horário combinados com a família.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 grid gap-1.5">
          <Label htmlFor="rs-date">Nova data</Label>
          <Input id="rs-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rs-time">Horário</Label>
          <Input id="rs-time" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rs-duration">Duração</Label>
          <Input
            id="rs-duration"
            type="number"
            min={10}
            max={240}
            step={5}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Voltar
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Salvando..." : "Remarcar"}
        </Button>
      </div>
    </form>
  );
}
