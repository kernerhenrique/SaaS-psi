"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Ação que pede confirmação em dois cliques, no próprio botão (sem janela do
 * navegador): o primeiro clique troca o texto para "Confirmar?"; se ninguém
 * confirmar em alguns segundos, volta ao normal.
 */
export function ConfirmButton({
  label,
  icon,
  onConfirm,
}: {
  label: string;
  icon?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
}) {
  const [armed, setArmed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timeout = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timeout);
  }, [armed]);

  async function handleClick() {
    if (!armed) return setArmed(true);
    setIsRunning(true);
    await onConfirm();
    setIsRunning(false);
    setArmed(false);
  }

  return (
    <Button variant={armed ? "destructive" : "ghost"} size="sm" onClick={handleClick} disabled={isRunning}>
      {icon}
      {armed ? "Confirmar?" : label}
    </Button>
  );
}
