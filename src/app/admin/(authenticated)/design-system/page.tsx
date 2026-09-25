import type { Metadata } from "next";

import { CopyMessageButton } from "@/components/copy-message-button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PatientAvatar } from "@/components/patient-avatar";
import { StatusBadge, type StatusKind } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import { ToastDemo } from "./toast-demo";

export const metadata: Metadata = { title: "Design system" };

// Página de referência do design system (não aparece no menu).
// Serve para aprovar o visual e para conferir os componentes ao mudar o tema.

const COLOR_TOKENS = [
  { name: "Fundo", className: "bg-background" },
  { name: "Card", className: "bg-card" },
  { name: "Destaque", className: "bg-primary" },
  { name: "Suave", className: "bg-muted" },
  { name: "Sálvia", className: "bg-tone-sage" },
  { name: "Mel", className: "bg-tone-honey" },
  { name: "Pêssego", className: "bg-tone-peach" },
  { name: "Céu", className: "bg-tone-sky" },
  { name: "Pedra", className: "bg-tone-stone" },
];

const STATUSES: StatusKind[] = [
  "paid",
  "pending",
  "wont-pay",
  "first-visit",
  "return-visit",
  "scheduled",
  "done",
  "cancelled",
  "no-show",
];

export default function DesignSystemPage() {
  return (
    <div className="space-y-10">
      <PageHeader title="Design system" description="Cores, tipografia e componentes base do sistema." />

      <Block title="Cores">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          {COLOR_TOKENS.map((token) => (
            <div key={token.name} className="space-y-2">
              <div className={`h-16 rounded-xl ring-1 ring-foreground/10 ${token.className}`} />
              <p className="text-xs text-muted-foreground">{token.name}</p>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Tipografia">
        <div className="space-y-3">
          <p className="font-display text-4xl font-medium tracking-tight">Título de página (Crimson Pro)</p>
          <p className="text-base font-semibold">Título de seção (Inter semibold)</p>
          <p className="text-sm">Texto de corpo (Inter). Usado em fichas, anotações e listas.</p>
          <p className="text-sm text-muted-foreground">Texto de apoio, em tom mais claro, para explicar cada campo.</p>
          <p className="font-display text-3xl font-medium tabular-nums">R$ 4.300,00</p>
        </div>
      </Block>

      <Block title="Botões">
        <div className="flex flex-wrap gap-2">
          <Button>Principal</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="outline">Contorno</Button>
          <Button variant="ghost">Discreto</Button>
          <Button variant="destructive">Cancelar consulta</Button>
          <CopyMessageButton message="Olá! Mensagem de teste do design system." />
          <ToastDemo />
        </div>
      </Block>

      <Block title="Status">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </Block>

      <Block title="Avatares">
        <div className="flex flex-wrap items-center gap-3">
          {["Lucas Almeida", "Beatriz Souza", "Sofia Martins", "Gabriel Rocha", "Helena Costa"].map((name) => (
            <PatientAvatar key={name} name={name} />
          ))}
          <PatientAvatar name="Pedro Henrique Lima" size="lg" />
        </div>
      </Block>

      <Block title="Campos">
        <div className="grid max-w-xl gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="ds-name">Nome do paciente</Label>
            <Input id="ds-name" placeholder="Ex.: Lucas Almeida" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ds-notes">Informações importantes de saúde</Label>
            <Textarea id="ds-notes" placeholder="Alergias, medicamentos, diagnósticos já conhecidos..." />
            <p className="text-xs text-muted-foreground">Preencha uma vez; você pode editar quando quiser.</p>
          </div>
        </div>
      </Block>

      <Block title="Estado vazio e carregamento">
        <div className="grid gap-6 lg:grid-cols-2">
          <EmptyState
            title="Nenhum paciente ainda"
            description="Cadastre o primeiro paciente para começar a registrar consultas e anotações."
            action={<Button>Cadastrar paciente</Button>}
          />
          <div className="space-y-3 rounded-2xl border p-6">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
      </Block>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-card p-6 shadow-soft ring-1 ring-foreground/5">
      <h2 className="mb-5 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
