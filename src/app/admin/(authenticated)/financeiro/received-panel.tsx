"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { formatPriceFromCents } from "@/lib/currency";
import { buildPaymentsCsv, MONTH_NAMES, monthlyTotals, sumCents, totalsByMethod, type PaymentRow } from "@/lib/finance";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";

import { periodParam, shiftPeriod, type Period } from "./period";
import { PaymentRows } from "./payment-rows";

function periodLabel(period: Period): string {
  return period.kind === "year" ? String(period.year) : `${MONTH_NAMES[period.month - 1]} de ${period.year}`;
}

export function ReceivedPanel({ rows, period, today }: { rows: PaymentRow[]; period: Period; today: string }) {
  const router = useRouter();
  const total = sumCents(rows);
  const byMethod = totalsByMethod(rows);
  const [todayYear, todayMonth] = today.split("-").map(Number);
  const isCurrent =
    period.kind === "year" ? period.year === todayYear : period.year === todayYear && period.month === todayMonth;

  function go(next: Period) {
    router.push(`/admin/financeiro?aba=recebidos&periodo=${periodParam(next)}`, { scroll: false });
  }

  function downloadCsv() {
    const blob = new Blob([buildPaymentsCsv([...rows].reverse())], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recebimentos-${periodParam(period)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-card shadow-soft ring-1 ring-foreground/5">
            <Button variant="ghost" size="icon" onClick={() => go(shiftPeriod(period, -1))} aria-label="Período anterior">
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => go(shiftPeriod(period, 1))} aria-label="Próximo período" disabled={isCurrent}>
              <ChevronRight />
            </Button>
          </div>
          <p className="font-semibold first-letter:uppercase">{periodLabel(period)}</p>
        </div>
        <Segmented
          label="Período"
          value={period.kind}
          onChange={(kind) =>
            go(kind === "year" ? { kind: "year", year: period.year } : { kind: "month", year: period.year, month: period.kind === "month" ? period.month : todayYear === period.year ? todayMonth : 12 })
          }
          options={[
            { value: "month", label: "Mês" },
            { value: "year", label: "Ano" },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className="rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/5">
          <p className="text-sm text-muted-foreground">Total recebido</p>
          <p className="font-display text-4xl font-medium tabular-nums">{formatPriceFromCents(total)}</p>
          <p className="mb-4 text-xs text-muted-foreground">
            {rows.length} {rows.length === 1 ? "pagamento" : "pagamentos"} · pela data do recebimento
          </p>
          {byMethod.length > 0 ? (
            <ul className="space-y-2 border-t pt-4">
              {byMethod.map((m) => (
                <li key={m.method} className="flex items-center justify-between text-sm">
                  <span>
                    {PAYMENT_METHOD_LABELS[m.method]} <span className="text-muted-foreground">({m.count})</span>
                  </span>
                  <span className="font-medium tabular-nums">{formatPriceFromCents(m.totalCents)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <Button variant="outline" className="mt-5 w-full" onClick={downloadCsv} disabled={rows.length === 0}>
            <Download />
            Baixar planilha (para o contador)
          </Button>
        </section>

        {period.kind === "year" ? (
          <section className="rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/5">
            <h3 className="mb-3 text-sm font-semibold">Mês a mês</h3>
            <table className="w-full text-sm">
              <tbody>
                {monthlyTotals(rows, period.year).map((cents, index) => (
                  <tr key={index} className="border-b border-border/60 last:border-0">
                    <td className="py-1.5 first-letter:uppercase">
                      <button
                        type="button"
                        className="first-letter:uppercase hover:underline"
                        onClick={() => go({ kind: "month", year: period.year, month: index + 1 })}
                      >
                        {MONTH_NAMES[index]}
                      </button>
                    </td>
                    <td className={`py-1.5 text-right tabular-nums ${cents ? "font-medium" : "text-muted-foreground"}`}>
                      {formatPriceFromCents(cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <div className="rounded-2xl bg-muted/50 p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Dica para o imposto de renda</p>
            <p className="mt-1">
              Veja o ano inteiro em “Ano” para o total de cada mês. A planilha pode ser enviada ao contador ou usada
              para preencher o carnê-leão.
            </p>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Nenhum pagamento recebido neste período" />
      ) : (
        <PaymentRows rows={rows} today={today} showPatient />
      )}
    </div>
  );
}
