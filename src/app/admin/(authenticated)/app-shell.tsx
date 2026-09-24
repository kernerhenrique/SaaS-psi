"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "cn";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/text";

import { LogoutButton } from "./logout-button";
import { BottomNav, SidebarNav } from "./nav-links";

const COLLAPSED_STORAGE_KEY = "sidebar-collapsed";

export type ShellBrand = { name: string; subtitle: string | null; logoUrl: string | null };

function BrandMark({ brand, compact = false }: { brand: ShellBrand; compact?: boolean }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", compact && "justify-center")}>
      {brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo enviado por cada psicóloga, de qualquer origem
        <img src={brand.logoUrl} alt="" className="size-9 shrink-0 object-contain" />
      ) : (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
          {getInitials(brand.name)}
        </span>
      )}
      {!compact ? (
        <div className="min-w-0">
          <p className="truncate font-display text-lg leading-tight font-medium">{brand.name}</p>
          {brand.subtitle ? <p className="truncate text-xs text-muted-foreground">{brand.subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ brand, children }: { brand: ShellBrand; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Preferência salva só no navegador; ler antes de montar quebraria a hidratação.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1");
    } catch {
      // storage indisponível: a sidebar só fica expandida
    }
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // só deixa de lembrar a preferência entre visitas
    }
  }

  return (
    <div className="flex flex-1">
      {/* Sidebar (desktop) */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r print:hidden border-sidebar-border bg-sidebar p-3 text-sidebar-foreground transition-[width] duration-200 ease-out sm:flex",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div className="px-1 pt-2 pb-6">
          <BrandMark brand={brand} compact={collapsed} />
        </div>
        <SidebarNav collapsed={collapsed} />
        <div className={cn("mt-auto flex items-center gap-1 pt-4", collapsed ? "flex-col" : "justify-between")}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
          <div className={cn("flex items-center gap-1", collapsed && "flex-col")}>
            <ThemeToggle />
            <LogoutButton compact />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topo (celular) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b print:hidden border-sidebar-border bg-sidebar/95 px-4 py-3 backdrop-blur sm:hidden">
          <BrandMark brand={brand} />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LogoutButton compact />
          </div>
        </header>

        <main className="flex-1 px-4 pt-6 pb-28 sm:px-8 sm:pt-10 sm:pb-12 lg:px-12 print:p-0">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
