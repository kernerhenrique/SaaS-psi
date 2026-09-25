import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="py-10">
      <EmptyState
        title="Página não encontrada"
        description="O que você procurou não existe ou foi removido."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/admin/pacientes" className={buttonVariants()}>
              Ver pacientes
            </Link>
            <Link href="/admin" className={buttonVariants({ variant: "outline" })}>
              Ir para o início
            </Link>
          </div>
        }
      />
    </div>
  );
}
