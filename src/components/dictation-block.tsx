"use client";

import { Mic, Square } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Um bloco de ditado: botão de microfone + texto (editável) + prévia do que
 * está sendo falado. O controle do microfone fica no componente pai, para
 * só um bloco escutar por vez.
 */
export function DictationBlock({
  id,
  label,
  hint,
  value,
  onChange,
  listening,
  interim,
  micAvailable,
  onToggleMic,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  listening: boolean;
  interim: string;
  micAvailable: boolean;
  onToggleMic: () => void;
}) {
  return (
    <section
      className={cn(
        "grid gap-3 rounded-2xl bg-card p-4 ring-1 transition sm:p-5",
        listening ? "ring-2 ring-primary shadow-soft" : "ring-foreground/5",
      )}
    >
      <div className="flex flex-col items-start gap-3">
        <div>
          <Label htmlFor={id} className="text-sm font-semibold">
            {label}
          </Label>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        {micAvailable ? (
          <Button
            type="button"
            variant={listening ? "destructive" : "default"}
            onClick={onToggleMic}
            className="h-10 rounded-xl px-4"
            aria-pressed={listening}
          >
            {listening ? <Square /> : <Mic />}
            {listening ? "Parar" : "Ditar"}
          </Button>
        ) : null}
      </div>

      {listening ? (
        <p className="flex items-center gap-2 text-xs font-medium text-primary" role="status">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
          Ouvindo… fale normalmente. Toque em “Parar” quando terminar.
        </p>
      ) : null}

      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-32 bg-background/60"
        placeholder={micAvailable ? "Toque em “Ditar” e fale, ou digite aqui." : "Digite aqui."}
      />
      {listening && interim ? (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground italic" aria-live="polite">
          {interim}…
        </p>
      ) : null}
    </section>
  );
}
