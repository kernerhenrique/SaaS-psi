"use client";

import { useState, type FormEvent } from "react";

import type { PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { centsToInput, inputToCents } from "@/lib/currency";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";

export type PaymentValues = {
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  amountCents: number;
};

const STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "PAID", label: "Já recebi" },
  { value: "PENDING", label: "Ainda não recebi" },
  { value: "WONT_PAY", label: "Não vai pagar" },
];

const METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => ({
  value: m,
  label: PAYMENT_METHOD_LABELS[m],
}));

/**
 * Registro do pagamento de uma consulta (feito fora da plataforma).
 * `onSubmit` devolve a mensagem de erro, ou `null` quando salvou.
 */
export function PaymentForm({
  initial,
  today,
  submitLabel = "Salvar pagamento",
  onSubmit,
  onCancel,
}: {
  initial: PaymentValues;
  today: string;
  submitLabel?: string;
  onSubmit: (values: PaymentValues) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [status, setStatus] = useState<PaymentStatus>(initial.paymentStatus);
  const [method, setMethod] = useState<PaymentMethod | null>(initial.paymentMethod ?? "PIX");
  const [paidAt, setPaidAt] = useState(initial.paidAt ?? today);
  const [amount, setAmount] = useState(centsToInput(initial.amountCents));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountCents = inputToCents(amount);
    if (amountCents === null) return setError("Valor inválido. Use por exemplo 200 ou 180,50.");

    setIsSaving(true);
    const isPaid = status === "PAID";
    const message = await onSubmit({
      paymentStatus: status,
      paymentMethod: isPaid ? method : null,
      paidAt: isPaid ? paidAt : null,
      amountCents,
    });
    setIsSaving(false);
    setError(message);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label>Pagamento</Label>
        <Segmented label="Situação do pagamento" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      </div>

      <div className="grid gap-1.5 sm:max-w-40">
        <Label htmlFor="payment-amount">Valor (R$)</Label>
        <Input
          id="payment-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Altere se houve desconto ou combinado diferente.</p>
      </div>

      {status === "PAID" ? (
        <>
          <div className="grid gap-2">
            <Label>Forma de pagamento</Label>
            <Segmented label="Forma de pagamento" value={method} onChange={setMethod} options={METHOD_OPTIONS} />
          </div>
          <div className="grid gap-1.5 sm:max-w-48">
            <Label htmlFor="payment-date">Recebido em</Label>
            <Input id="payment-date" type="date" max={today} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>
        </>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Voltar
          </Button>
        ) : null}
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
