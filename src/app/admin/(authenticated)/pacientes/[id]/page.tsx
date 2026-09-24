import { notFound } from "next/navigation";

import { NotFoundError } from "@/server/errors";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getBusinessToday } from "@/server/modules/business/business.service";
import { getPatientRecord, type PatientRecord } from "@/server/modules/patient/patient.service";

import { PatientRecordView } from "./patient-record-view";

export default async function PatientRecordPage({ params }: PageProps<"/admin/pacientes/[id]">) {
  const session = await requireAdminSession();
  const { id } = await params;

  let record: PatientRecord;
  try {
    record = await getPatientRecord(session.businessId, id);
  } catch (error) {
    // Paciente de outra conta ou inexistente: mesma página 404, sem revelar qual caso.
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const today = await getBusinessToday(session.businessId);
  return <PatientRecordView record={record} today={today} />;
}
