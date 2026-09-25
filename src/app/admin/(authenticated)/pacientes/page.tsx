import type { Metadata } from "next";

import { requireAdminSession } from "@/server/modules/auth/session";
import { listPatients } from "@/server/modules/patient/patient.service";

import { PatientsView } from "./patients-view";

export const metadata: Metadata = { title: "Pacientes" };

export default async function PatientsPage() {
  const session = await requireAdminSession();
  const patients = await listPatients(session.businessId);
  return <PatientsView patients={patients} />;
}
