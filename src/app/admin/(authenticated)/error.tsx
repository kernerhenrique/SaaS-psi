"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";

/** Erro inesperado em alguma tela do painel: mensagem calma e caminho para tentar de novo. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Só o código do erro vai para o console — nunca dados do prontuário.
    console.error("Erro no painel", error.digest ?? error.name);
  }, [error]);

  return (
    <div className="py-10">
      <EmptyState
        title="Algo não saiu como esperado"
        description="Nenhum dado foi perdido. Tente de novo; se continuar, volte para o início e repita o que estava fazendo."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={reset}>
              <RotateCcw />
              Tentar de novo
            </Button>
            <Link href="/admin" className={buttonVariants({ variant: "outline" })}>
              Ir para o início
            </Link>
          </div>
        }
      />
    </div>
  );
}
