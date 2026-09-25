import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { parseSessionTypeInput, updateSessionType } from "@/server/modules/settings/settings.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    await updateSessionType(session.businessId, id, parseSessionTypeInput(body));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
