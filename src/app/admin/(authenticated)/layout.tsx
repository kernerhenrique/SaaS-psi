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

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: session.businessId },
  });

  return (
    <AccentColorScope accentColor={business.accentColor} className="flex flex-1 flex-col">
      <AppShell brand={{ name: business.name, subtitle: "Psicóloga", logoUrl: business.logoUrl }}>
        {children}
      </AppShell>
    </AccentColorScope>
  );
}
