"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";

import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { DEFAULT_ACCENT_COLOR } from "@/lib/accent-color";
import { centsToInput, inputToCents } from "@/lib/currency";
import { formatPhone } from "@/lib/phone";
import type { Settings } from "@/server/modules/settings/settings.service";

// Cores com contraste conferido (texto claro sobre a cor e a cor como texto no fundo creme).
const ACCENT_PRESETS = [
  { name: "Sálvia", value: DEFAULT_ACCENT_COLOR.toLowerCase() },
  { name: "Oliva", value: "#6b6436" },
  { name: "Azul", value: "#3f6386" },
  { name: "Petróleo", value: "#2f6b6b" },
  { name: "Lavanda", value: "#6a5a8c" },
  { name: "Terracota", value: "#a24d34" },
  { name: "Rosa", value: "#a3456b" },
  { name: "Grafite", value: "#4a4640" },
];

export function SettingsView({ settings }: { settings: Settings }) {
  return (
    <div className="space-y-8">
      <FadeIn>
        <PageHeader title="Configurações" description="Seus dados, os valores das consultas e a cor do sistema." />
      </FadeIn>
      <FadeIn delay={0.05}>
        <ProfileForm business={settings.business} />
      </FadeIn>
      <FadeIn delay={0.1}>
        <SessionTypesForm sessionTypes={settings.sessionTypes} />
      </FadeIn>
      <FadeIn delay={0.15}>
        <section className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-semibold">Mensagens de WhatsApp</h2>
            <p className="text-sm text-muted-foreground">
              Os textos das mensagens e o prazo para sugerir a cobrança ficam na tela Mensagens.
            </p>
          </div>
          <Link href="/admin/mensagens" className={buttonVariants({ variant: "outline" })}>
            <MessageCircle />
            Editar mensagens
          </Link>
        </section>
      </FadeIn>
    </div>
  );
}

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/5 sm:p-6">
      <header className="mb-5">
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  );
}

function ProfileForm({ business }: { business: Settings["business"] }) {
  const router = useRouter();
  const [name, setName] = useState(business.name);
  const [crp, setCrp] = useState(business.crp ?? "");
  const [whatsapp, setWhatsapp] = useState(business.whatsapp ? formatPhone(business.whatsapp) : "");
  const [address, setAddress] = useState(business.address ?? "");
  const [accent, setAccent] = useState((business.accentColor ?? DEFAULT_ACCENT_COLOR).toLowerCase());
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const result = await apiRequest("/api/admin/settings/profile", "PATCH", {
      name,
      crp,
      whatsapp,
      address,
      // A cor padrão fica gravada como "sem personalização".
      accentColor: accent === DEFAULT_ACCENT_COLOR.toLowerCase() ? null : accent,
    });
    setIsSaving(false);
    if (!result.ok) return setError(result.error);
    setError(null);
    toast.success("Configurações salvas");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card
        title="Seus dados"
        description="Aparecem no menu, na saudação e no cabeçalho dos relatórios impressos."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="cfg-name">Seu nome</Label>
            <Input id="cfg-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cfg-crp">CRP</Label>
            <Input id="cfg-crp" value={crp} onChange={(e) => setCrp(e.target.value)} placeholder="CRP 00/00000" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cfg-whatsapp">WhatsApp do consultório</Label>
            <Input
              id="cfg-whatsapp"
              type="tel"
              inputMode="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              onBlur={(e) => setWhatsapp(formatPhone(e.target.value))}
              placeholder="(27) 99999-9999"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cfg-address">Endereço (opcional)</Label>
            <Input id="cfg-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>

        <div className="mt-6 grid gap-2">
          <Label>Cor de destaque</Label>
          <p className="text-xs text-muted-foreground">Usada nos botões e no item selecionado do menu.</p>
          <div role="radiogroup" aria-label="Cor de destaque" className="flex flex-wrap gap-3">
            {ACCENT_PRESETS.map((preset) => {
              const selected = accent === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={preset.name}
                  title={preset.name}
                  onClick={() => setAccent(preset.value)}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    selected && "ring-2 ring-foreground/60",
                  )}
                  style={{ backgroundColor: preset.value }}
                >
                  {selected ? <Check className="size-4 text-white" /> : null}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span
              className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-white"
              style={{ backgroundColor: accent }}
            >
              Exemplo de botão
            </span>
            <span className="text-sm font-medium" style={{ color: accent }}>
              Exemplo de link
            </span>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </Card>
    </form>
  );
}

function SessionTypesForm({ sessionTypes }: { sessionTypes: Settings["sessionTypes"] }) {
  return (
    <Card
      title="Tipos de consulta e valores"
      description="Os novos valores valem para as próximas consultas. As já marcadas mantêm o valor combinado."
    >
      <ul className="space-y-3">
        {sessionTypes.map((type) => (
          <SessionTypeRow key={`${type.id}:${type.priceCents}:${type.durationMin}:${type.name}`} type={type} />
        ))}
      </ul>
    </Card>
  );
}

function SessionTypeRow({ type }: { type: Settings["sessionTypes"][number] }) {
  const router = useRouter();
  const [name, setName] = useState(type.name);
  const [price, setPrice] = useState(centsToInput(type.priceCents));
  const [duration, setDuration] = useState(String(type.durationMin));
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = name !== type.name || price !== centsToInput(type.priceCents) || duration !== String(type.durationMin);

  async function save() {
    const priceCents = inputToCents(price);
    if (priceCents === null) {
      toast.error("Valor inválido. Use por exemplo 200 ou 180,50.");
      return;
    }
    setIsSaving(true);
    const result = await apiRequest(`/api/admin/session-types/${type.id}`, "PATCH", {
      name,
      priceCents,
      durationMin: Number(duration),
    });
    setIsSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Tipo de consulta atualizado", { description: name });
    router.refresh();
  }

  return (
    <li className="grid gap-3 rounded-xl bg-muted/50 p-3 sm:grid-cols-[1fr_8rem_8rem_auto] sm:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor={`st-name-${type.id}`}>
          Nome {type.isFirstVisit ? <span className="font-normal text-muted-foreground">(primeira consulta)</span> : null}
        </Label>
        <Input id={`st-name-${type.id}`} value={name} onChange={(e) => setName(e.target.value)} className="bg-card" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`st-price-${type.id}`}>Valor (R$)</Label>
        <Input
          id={`st-price-${type.id}`}
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="bg-card"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`st-duration-${type.id}`}>Duração (min)</Label>
        <Input
          id={`st-duration-${type.id}`}
          type="number"
          min={10}
          max={240}
          step={5}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="bg-card"
        />
      </div>
      <Button onClick={save} disabled={!isDirty || isSaving}>
        {isSaving ? "Salvando..." : "Salvar"}
      </Button>
    </li>
  );
}
