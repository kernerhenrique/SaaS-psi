import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        title="Página não encontrada"
        description="Confira o endereço ou volte para o início."
        action={
          <Link href="/admin" className={buttonVariants()}>
            Ir para o início
          </Link>
        }
        className="max-w-md bg-card"
      />
    </main>
  );
}
