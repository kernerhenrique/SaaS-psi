import type { Metadata } from "next";

import { requireAdminSession } from "@/server/modules/auth/session";
import { getSettings } from "@/server/modules/settings/settings.service";

import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const session = await requireAdminSession();
  const settings = await getSettings(session.businessId);
  return <SettingsView settings={settings} />;
}
