"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, HandCoins, Search } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PatientAvatar } from "@/components/patient-avatar";
import { StatTile } from "@/components/stat-tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPriceFromCents } from "@/lib/currency";
import { sumCents, type PaymentRow } from "@/lib/finance";

import { PaymentRows } from "./payment-rows";

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function PatientPanel({
  patients,
  selectedPatientId,
  rows,
  today,
}: {
  patients: { id: string; fullName: string }[];
  selectedPatientId: string | null;
  rows: PaymentRow[] | null;
  today: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const selected = patients.find((p) => p.id === selectedPatientId) ?? null;

  const matches = useMemo(() => {
    const q = normalize(search.trim());
    return q ? patients.filter((p) => normalize(p.fullName).includes(q)) : patients;
  }, [patients, search]);

  function select(id: string | null) {
    router.push(`/admin/financeiro?aba=paciente${id ? `&paciente=${id}` : ""}`, { scroll: false });
  }

  if (!selected || !rows) {
    return (
      <div className="max-w-md space-y-3">
        <p className="text-sm text-muted-foreground">Escolha um paciente para ver todos os pagamentos dele.</p>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente"
            className="h-10 rounded-xl bg-card pl-9"
            aria-label="Buscar paciente"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto rounded-2xl bg-card shadow-soft ring-1 ring-foreground/5">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => select(p.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <PatientAvatar name={p.fullName} size="sm" />
                {p.fullName}
              </button>
            </li>
          ))}
          {matches.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhum paciente encontrado.</li> : null}
        </ul>
      </div>
    );
  }

  const paid = rows.filter((r) => r.paymentStatus === "PAID");
  const pending = rows.filter((r) => r.status === "DONE" && r.paymentStatus === "PENDING");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PatientAvatar name={selected.fullName} />
          <Link href={`/admin/pacientes/${selected.id}`} className="font-medium hover:underline">
            {selected.fullName}
          </Link>
        </div>
        <Button variant="outline" onClick={() => select(null)}>
          Trocar paciente
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-lg">
        <StatTile icon={CircleCheck} tone="sage" label="Total pago" value={formatPriceFromCents(sumCents(paid))} hint={`${paid.length} pagamentos`} />
        <StatTile icon={HandCoins} tone="honey" label="A receber" value={formatPriceFromCents(sumCents(pending))} hint={`${pending.length} consultas`} />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Nenhuma consulta realizada ainda" />
      ) : (
        <PaymentRows rows={rows} today={today} showPatient={false} />
      )}
    </div>
  );
}
