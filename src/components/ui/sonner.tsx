"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Toasts discretos no rodapé, com as cores do design system. */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      duration={2500}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border-border !bg-card !text-card-foreground !shadow-soft !font-sans",
          description: "!text-muted-foreground",
          icon: "!text-primary",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
