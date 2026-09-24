import { redirect } from "next/navigation";

import { AccentColorScope } from "@/components/accent-color-scope";
import { prisma } from "@/server/db/prisma";
import { getAdminSession } from "@/server/modules/auth/session";

import { AppShell } from "./app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  // O access token só é verificado pela assinatura; se a conta deixou de existir
  // (ex.: banco de dev recriado) manda para o login em vez de quebrar a página.
  const business = await prisma.business.findUnique({
    where: { id: session.businessId },
  });
  if (!business) {
    redirect("/admin/login");
  }

  const subtitle = business.crp ? `Psicóloga · ${business.crp}` : "Psicóloga";

  return (
    <AccentColorScope accentColor={business.accentColor} className="flex flex-1 flex-col">
      <AppShell brand={{ name: business.name, subtitle, logoUrl: business.logoUrl }}>
        {children}
      </AppShell>
    </AccentColorScope>
  );
}
