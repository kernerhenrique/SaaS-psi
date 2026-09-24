"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import {
  DEFAULT_MESSAGE_TEMPLATES,
  findInvalidVariables,
  MESSAGE_VARIABLES,
  renderMessageTemplate,
  TEMPLATE_INFO,
  type MessageTemplateKind,
} from "@/lib/message-template";

const EXAMPLE_VALUES = Object.fromEntries(
  Object.entries(MESSAGE_VARIABLES).map(([key, info]) => [key, info.example]),
);

// Na cobrança a data é de uma consulta que já passou.
const EXAMPLE_BY_KIND: Record<MessageTemplateKind, Record<string, string>> = {
  reminder: EXAMPLE_VALUES,
  "return-invite": EXAMPLE_VALUES,
  "payment-reminder": { ...EXAMPLE_VALUES, data: "18/09" },
};

/** Edição de um modelo de mensagem, com botões de variáveis e prévia ao vivo. */
export function TemplateEditor({ kind, value }: { kind: MessageTemplateKind; value: string }) {
  const router = useRouter();
  const info = TEMPLATE_INFO[kind];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = text !== value;
  const isDefault = value === DEFAULT_MESSAGE_TEMPLATES[kind];
  const invalid = findInvalidVariables(text, kind);

  /** Insere a variável onde está o cursor (ou no fim), mantendo o foco no texto. */
  function insertVariable(name: string) {
    const token = `{${name}}`;
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + token + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function save() {
    setIsSaving(true);
    const result = await apiRequest(`/api/admin/message-templates/${kind}`, "PUT", { content: text });
    setIsSaving(false);
    if (!result.ok) return setError(result.error);
    setError(null);
    toast.success("Modelo salvo", { description: info.title });
    router.refresh();
  }

  async function restore() {
    setIsSaving(true);
    const result = await apiRequest(`/api/admin/message-templates/${kind}`, "DELETE");
    setIsSaving(false);
    if (!result.ok) return setError(result.error);
    setText(DEFAULT_MESSAGE_TEMPLATES[kind]);
    setError(null);
    toast.success("Texto padrão restaurado");
    router.refresh();
  }

  return (
    <section className="grid gap-4 rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/5 sm:p-6 lg:grid-cols-2">
      <div className="grid content-start gap-3">
        <div>
          <Label htmlFor={`tpl-${kind}`} className="text-base font-semibold">
            {info.title}
          </Label>
          <p className="text-sm text-muted-foreground">{info.description}</p>
        </div>
        <Textarea
          id={`tpl-${kind}`}
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-32"
        />
        <div className="flex flex-wrap gap-1.5" aria-label="Inserir variável">
          {info.variables.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => insertVariable(name)}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium transition hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Plus className="size-3" />
              {MESSAGE_VARIABLES[name].label}
            </button>
          ))}
        </div>
        {invalid.length ? (
          <p className="text-xs text-destructive">
            {invalid.map((name) => `{${name}}`).join(", ")} não {invalid.length === 1 ? "é reconhecida" : "são reconhecidas"}{" "}
            nesta mensagem — use os botões acima para inserir as variáveis.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={!isDirty || isSaving || invalid.length > 0}>
            {isSaving ? "Salvando..." : "Salvar modelo"}
          </Button>
          {isDirty ? (
            <Button variant="ghost" onClick={() => setText(value)} disabled={isSaving}>
              Desfazer alterações
            </Button>
          ) : null}
          {!isDefault && !isDirty ? (
            <Button variant="ghost" onClick={restore} disabled={isSaving}>
              <RotateCcw />
              Restaurar texto padrão
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid content-start gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Como fica (exemplo)</p>
        {/* Balão no estilo de conversa, para a psicóloga ver o texto final. */}
        <div className="rounded-2xl rounded-tr-sm bg-tone-sage p-4 text-sm whitespace-pre-line text-tone-sage-foreground shadow-soft">
          {renderMessageTemplate(text, EXAMPLE_BY_KIND[kind]) || <span className="opacity-60">A mensagem aparece aqui.</span>}
        </div>
      </div>
    </section>
  );
}
