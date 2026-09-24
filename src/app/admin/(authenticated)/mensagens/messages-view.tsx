"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CalendarHeart, HandCoins } from "lucide-react";
import { toast } from "sonner";

import { CopyMessageButton } from "@/components/copy-message-button";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { PatientAvatar } from "@/components/patient-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { apiRequest } from "@/lib/api-client";
import { formatPriceFromCents } from "@/lib/currency";
import { formatShortDate, friendlyDateLabel } from "@/lib/date";
import { renderMessageTemplate, TEMPLATE_KINDS, type MessageTemplateKind } from "@/lib/message-template";
import type { OutgoingMessages } from "@/server/modules/message/outgoing.service";

import { TemplateEditor } from "./template-editor";

function firstName(name: string | null): string {
  return name?.split(" ")[0] ?? "";
}

type Suggestion = {
  id: string;
  patientName: string;
  context: string;
  phone: string | null;
  message: string;
};

export function MessagesView({
  outgoing,
  templates,
}: {
  outgoing: OutgoingMessages;
  templates: Record<MessageTemplateKind, string>;
}) {
  const { today, timezone } = outgoing;

  const reminders: Suggestion[] = outgoing.reminders.map((r) => {
    const data = friendlyDateLabel(r.date, today, timezone);
    return {
      id: r.sessionId,
      patientName: r.patientName,
      context: `Consulta ${data.split(" (")[0]} às ${r.time}${r.guardianName ? ` · para ${r.guardianName}` : ""}`,
      phone: r.guardianPhone,
      message: renderMessageTemplate(templates.reminder, {
        responsavel: firstName(r.guardianName),
        nomePaciente: firstName(r.patientName),
        data,
        hora: r.time,
      }),
    };
  });

  const payments: Suggestion[] = outgoing.payments.map((p) => ({
    id: p.sessionId,
    patientName: p.patientName,
    context: `${formatPriceFromCents(p.amountCents)} da consulta de ${formatShortDate(p.sessionDate)} · há ${p.daysPending} dias`,
    phone: p.guardianPhone,
    message: renderMessageTemplate(templates["payment-reminder"], {
      responsavel: firstName(p.guardianName),
      nomePaciente: firstName(p.patientName),
      data: formatShortDate(p.sessionDate),
      valor: formatPriceFromCents(p.amountCents),
    }),
  }));

  const returns: Suggestion[] = outgoing.returns.map((r) => ({
    id: r.patientId,
    patientName: r.patientName,
    context: `Última consulta há ${r.daysSinceLastSession} dias`,
    phone: r.guardianPhone,
    message: renderMessageTemplate(templates["return-invite"], {
      responsavel: firstName(r.guardianName),
      nomePaciente: firstName(r.patientName),
    }),
  }));

  const total = reminders.length + payments.length + returns.length;

  return (
    <div className="space-y-10">
      <FadeIn>
        <PageHeader
          title="Mensagens"
          description="Mensagens prontas para os pais. Copie e cole no WhatsApp, ou abra a conversa direto com o texto escrito."
        />
      </FadeIn>

      <FadeIn delay={0.05} className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Para enviar agora</h2>
          <p className="text-sm text-muted-foreground">
            {total === 0 ? "Nenhuma mensagem sugerida no momento." : "Sugestões com base na agenda e nos pagamentos."}
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <SuggestionGroup
            icon={<BellRing className="size-4" />}
            title="Lembretes"
            hint="Consultas de hoje e amanhã"
            empty="Nenhuma consulta até amanhã."
            items={reminders}
          />
          <SuggestionGroup
            icon={<HandCoins className="size-4" />}
            title="Cobranças"
            hint={`Pendentes há ${outgoing.paymentReminderDays} dias ou mais`}
            empty="Nenhum pagamento atrasado."
            items={payments}
          />
          <SuggestionGroup
            icon={<CalendarHeart className="size-4" />}
            title="Convites de retorno"
            hint="Sem próxima consulta marcada"
            empty="Todos já têm retorno marcado."
            items={returns}
          />
        </div>
      </FadeIn>

      <FadeIn delay={0.1} className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Modelos</h2>
          <p className="text-sm text-muted-foreground">
            Escreva do seu jeito. As partes entre chaves, como {"{nomePaciente}"}, são preenchidas automaticamente.
          </p>
        </div>
        {TEMPLATE_KINDS.map((kind) => (
          // key com o texto salvo: depois de salvar/restaurar, o editor recomeça do valor novo.
          <TemplateEditor key={`${kind}:${templates[kind]}`} kind={kind} value={templates[kind]} />
        ))}
        <ReminderDaysSetting value={outgoing.paymentReminderDays} />
      </FadeIn>
    </div>
  );
}

function SuggestionGroup({
  icon,
  title,
  hint,
  empty,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  empty: string;
  items: Suggestion[];
}) {
  return (
    <section className="flex flex-col rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/5">
      <header className="mb-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <span className="text-muted-foreground">{icon}</span>
          {title}
          {items.length ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{items.length}</span>
          ) : null}
        </h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </header>
      {items.length === 0 ? (
        <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl bg-muted/50 p-3">
              <div className="flex items-center gap-2.5">
                <PatientAvatar name={item.patientName} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.patientName}</p>
                  <p className="text-xs text-muted-foreground">{item.context}</p>
                </div>
              </div>
              <p className="mt-2 line-clamp-3 text-xs text-muted-foreground" title={item.message}>
                {item.message}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <CopyMessageButton message={item.message} label="Copiar" size="sm" className="w-full" />
                <WhatsAppButton phone={item.phone} message={item.message} className="w-full" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReminderDaysSetting({ value }: { value: number }) {
  const router = useRouter();
  const [days, setDays] = useState(String(value));
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    setIsSaving(true);
    const result = await apiRequest("/api/admin/settings/payment-reminder", "PATCH", { days: Number(days) });
    setIsSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Prazo atualizado");
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
      <div className="grid gap-1.5">
        <Label htmlFor="reminder-days" className="text-base font-semibold">
          Quando sugerir a cobrança
        </Label>
        <p className="text-sm text-muted-foreground">
          Depois de quantos dias sem pagamento a consulta aparece em “Cobranças”.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          id="reminder-days"
          type="number"
          min={1}
          max={30}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="w-20"
        />
        <span className="text-sm text-muted-foreground">dias</span>
        <Button onClick={save} disabled={isSaving || Number(days) === value}>
          Salvar
        </Button>
      </div>
    </section>
  );
}
