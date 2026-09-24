"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronRight, Plus, Search, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { PatientAvatar } from "@/components/patient-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatShortDate } from "@/lib/date";
import type { PatientListItem } from "@/server/modules/patient/patient.service";

import { PatientFormDialog } from "./patient-form-dialog";

/** Busca sem diferenciar acentos e maiúsculas ("joao" encontra "João"). */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function PatientsView({ patients }: { patients: PatientListItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return patients;
    return patients.filter(
      (p) => normalize(p.fullName).includes(q) || (p.primaryGuardian && normalize(p.primaryGuardian.name).includes(q)),
    );
  }, [patients, query]);

  const newPatientButton = (
    <PatientFormDialog
      trigger={
        <Button size="lg" className="h-10 rounded-xl px-4">
          <Plus />
          Novo paciente
        </Button>
      }
      onSaved={(id) => router.push(`/admin/pacientes/${id}`)}
    />
  );

  return (
    <div className="space-y-8">
      <FadeIn>
        <PageHeader
          title="Pacientes"
          description={
            patients.length === 1 ? "1 paciente cadastrado" : `${patients.length} pacientes cadastrados`
          }
          actions={newPatientButton}
        />
      </FadeIn>

      {patients.length === 0 ? (
        <EmptyState
          title="Nenhum paciente ainda"
          description="Cadastre o primeiro paciente para começar a registrar consultas e anotações."
          action={newPatientButton}
        />
      ) : (
        <FadeIn delay={0.05} className="space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pelo nome do paciente ou do responsável"
              className="h-10 rounded-xl bg-card pl-9"
              aria-label="Buscar paciente"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
              Nenhum paciente encontrado para “{query}”.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/pacientes/${p.id}`}
                    className="group flex h-full items-center gap-4 rounded-2xl bg-card p-4 shadow-soft ring-1 ring-foreground/5 transition hover:-translate-y-0.5 hover:ring-primary/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <PatientAvatar name={p.fullName} size="lg" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-medium">
                        {p.fullName}
                        {p.age !== null ? <span className="font-normal text-muted-foreground"> · {p.age} anos</span> : null}
                      </p>
                      {p.primaryGuardian ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {p.primaryGuardian.relationship}: {p.primaryGuardian.name}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="size-3.5" />
                          {p.nextSessionDate
                            ? `Próxima: ${formatShortDate(p.nextSessionDate)}`
                            : p.lastSessionDate
                              ? `Última: ${formatShortDate(p.lastSessionDate)}`
                              : "Sem consultas"}
                        </span>
                        {p.openFollowUps > 0 ? (
                          <span className="inline-flex items-center gap-1 text-tone-honey-foreground">
                            <Sparkles className="size-3.5" />
                            {p.openFollowUps} para acompanhar
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </FadeIn>
      )}
    </div>
  );
}
