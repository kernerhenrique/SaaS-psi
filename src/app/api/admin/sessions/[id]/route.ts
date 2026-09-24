import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { parseScheduleInput } from "@/server/modules/session/session.parse";
import { rescheduleSession } from "@/server/modules/session/session.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Remarca a consulta (nova data, horário e duração). */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    await rescheduleSession(session.businessId, id, parseScheduleInput(body));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
