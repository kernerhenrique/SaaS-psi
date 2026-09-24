import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getBusinessToday } from "@/server/modules/business/business.service";
import { parsePatientInput } from "@/server/modules/patient/patient.parse";
import { createPatient, listPatients } from "@/server/modules/patient/patient.service";

export async function GET() {
  try {
    const session = await requireAdminSession();
    const patients = await listPatients(session.businessId);
    return NextResponse.json({ patients });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await request.json().catch(() => null);
    const input = parsePatientInput(body, await getBusinessToday(session.businessId));
    const patient = await createPatient(session.businessId, input);
    return NextResponse.json({ patient }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
