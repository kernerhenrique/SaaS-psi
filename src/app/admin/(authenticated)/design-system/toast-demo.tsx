"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ToastDemo() {
  return (
    <Button variant="outline" onClick={() => toast.success("Pagamento registrado", { description: "Sofia Martins · R$ 200,00" })}>
      Mostrar toast
    </Button>
  );
}
