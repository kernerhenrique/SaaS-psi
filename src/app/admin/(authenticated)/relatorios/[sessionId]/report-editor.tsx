"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

import { ConfirmButton } from "@/components/confirm-button";
import { CopyMessageButton } from "@/components/copy-message-button";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { formatFullDate } from "@/lib/date";
import type { ReportPageData } from "@/server/modules/report/report.service";

import { ReportPaper } from "./report-paper";

type Mode = "edit" | "preview";

export function ReportEditor({ data }: { data: ReportPageData }) {
  const router = useRouter();
  const [content, setContent] = useState(data.saved?.content ?? data.draft);
  const [mode, setMode] = useState<Mode>(data.saved ? "preview" : "edit");
  const [isSaving, setIsSaving] = useState(false);

  const savedContent = data.saved?.content ?? null;
  const isDirty = content !== savedContent;

  async function save() {
    setIsSaving(true);
    const result = await apiRequest(`/api/admin/sessions/${data.sessionId}/report`, "PUT", { content });
    setIsSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Relatório salvo");
    setMode("preview");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Barra de ações (não sai na impressão) */}
      <div className="space-y-4 print:hidden">
        <Link
          href={`/admin/pacientes/${data.patientId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {data.patientName}
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Relatório</h1>
            <p className="text-sm text-muted-foreground">
              Consulta de {formatFullDate(data.sessionDate)} ·{" "}
              {data.saved
                ? isDirty
                  ? "alterações ainda não salvas"
                  : `salvo em ${formatFullDate(data.saved.updatedAt.slice(0, 10))}`
                : "rascunho montado a partir das anotações — revise antes de salvar"}
            </p>
          </div>
          <Segmented
            label="Modo"
            value={mode}
            onChange={setMode}
            options={[
              { value: "edit", label: "Editar texto" },
              { value: "preview", label: "Ver como fica" },
            ]}
          />
        </div>

        {!data.hasNote && !data.saved ? (
          <p className="rounded-xl bg-tone-honey/60 p-3 text-sm text-tone-honey-foreground">
            Esta consulta ainda não tem anotações — o rascunho saiu quase vazio. Você pode escrever direto aqui ou
            anotar a consulta na ficha do paciente primeiro.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={isSaving || !isDirty || !content.trim()}>
            <Save />
            {isSaving ? "Salvando..." : "Salvar relatório"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setMode("preview");
              // Dá tempo de a visualização aparecer antes de abrir a impressão.
              setTimeout(() => window.print(), 50);
            }}
          >
            <Printer />
            Imprimir / salvar PDF
          </Button>
          <CopyMessageButton message={content} label="Copiar texto" />
          <ConfirmButton
            label="Refazer a partir das anotações"
            icon={<RefreshCw />}
            onConfirm={() => {
              setContent(data.draft);
              setMode("edit");
              toast.success("Rascunho refeito", { description: "Revise e salve para substituir o relatório." });
            }}
          />
        </div>
      </div>

      {mode === "edit" ? (
        <div className="grid gap-2 print:hidden">
          <p className="text-xs text-muted-foreground">
            Dica: linhas escritas TODAS EM MAIÚSCULAS viram títulos de seção no documento.
          </p>
          <Textarea
            aria-label="Texto do relatório"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[60vh] bg-card font-sans text-[15px] leading-relaxed"
          />
        </div>
      ) : null}

      {/* O papel sempre existe para a impressão; na tela só aparece em "Ver como fica". */}
      <div className={mode === "edit" ? "hidden print:block" : undefined}>
        <ReportPaper brand={data.brand} content={content} date={data.today} />
      </div>
    </div>
  );
}
