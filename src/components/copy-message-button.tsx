"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Copia uma mensagem pronta para colar no WhatsApp. O ícone vira um "check"
 * por alguns segundos e um toast confirma — feedback imediato para quem não
 * tem certeza se "copiou mesmo".
 */
export function CopyMessageButton({
  message,
  label = "Copiar mensagem",
  variant = "outline",
  size = "default",
  className,
}: {
  message: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Mensagem copiada", { description: "Agora é só colar na conversa do WhatsApp." });
    } catch {
      toast.error("Não foi possível copiar", { description: "Selecione o texto e copie manualmente." });
    }
  }

  return (
    <Button variant={variant} size={size} onClick={copy} aria-live="polite" className={className}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? "copied" : "copy"}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="inline-flex"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </motion.span>
      </AnimatePresence>
      {copied ? "Copiada!" : label}
    </Button>
  );
}
