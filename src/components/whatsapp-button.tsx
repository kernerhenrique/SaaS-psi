import { MessageCircle } from "lucide-react";
import { cn } from "cn";

import { buttonVariants } from "@/components/ui/button";
import { buildWhatsAppLink } from "@/lib/message-template";

/**
 * Abre a conversa com o responsável no WhatsApp já com a mensagem escrita.
 * Nada é enviado automaticamente: a psicóloga revisa e toca em enviar no próprio WhatsApp.
 */
export function WhatsAppButton({
  phone,
  message,
  size = "sm",
  className,
}: {
  phone: string | null;
  message: string;
  size?: "sm" | "default";
  className?: string;
}) {
  if (!phone) {
    return (
      <span
        className={cn(buttonVariants({ variant: "ghost", size }), "cursor-not-allowed text-muted-foreground opacity-70", className)}
        title="Cadastre o telefone do responsável na ficha do paciente"
      >
        <MessageCircle />
        Sem telefone
      </span>
    );
  }

  return (
    <a
      href={buildWhatsAppLink(phone, message)}
      target="_blank"
      rel="noreferrer"
      className={cn(
        buttonVariants({ variant: "outline", size }),
        "border-tone-sage-foreground/20 bg-tone-sage text-tone-sage-foreground hover:bg-tone-sage/80",
        className,
      )}
    >
      <MessageCircle />
      Abrir no WhatsApp
    </a>
  );
}
