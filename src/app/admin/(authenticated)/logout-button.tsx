"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  if (compact) {
    return (
      <Button variant="ghost" size="icon-sm" onClick={handleLogout} disabled={isLoading} aria-label="Sair" title="Sair">
        <LogOut />
      </Button>
    );
  }

  return (
    <Button variant="ghost" onClick={handleLogout} disabled={isLoading}>
      <LogOut />
      {isLoading ? "Saindo..." : "Sair"}
    </Button>
  );
}
