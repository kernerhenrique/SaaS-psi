"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PatientReportDocument } from "@/server/modules/report/report.service";

import { PatientReportPaper } from "./patient-report-paper";

export function PatientReportView({ data }: { data: PatientReportDocument }) {
  return (
    <div className="space-y-6">
      {/* Barra de ações (não sai na impressão) */}
      <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href={`/admin/pacientes/${data.patientId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {data.patientName}
          </Link>
          <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Prontuário</h1>
          <p className="text-sm text-muted-foreground">
            {data.entries.length} {data.entries.length === 1 ? "consulta documentada" : "consultas documentadas"}
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer />
          Imprimir / salvar PDF
        </Button>
      </div>

      <PatientReportPaper data={data} />
    </div>
  );
}
