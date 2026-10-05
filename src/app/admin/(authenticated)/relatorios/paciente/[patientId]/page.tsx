import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NotFoundError } from "@/server/errors";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getPatientReportDocument, type PatientReportDocument } from "@/server/modules/report/report.service";

import { PatientReportView } from "./patient-report-view";

export const metadata: Metadata = { title: "Prontuário" };

export default async function PatientReportPage({ params }: PageProps<"/admin/relatorios/paciente/[patientId]">) {
  const session = await requireAdminSession();
  const { patientId } = await params;

  let data: PatientReportDocument;
  try {
    data = await getPatientReportDocument(session.businessId, patientId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return <PatientReportView data={data} />;
}
