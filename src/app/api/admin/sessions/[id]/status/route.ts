import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { parseSessionStatus } from "@/server/modules/session/session.parse";
import { setSessionStatus } from "@/server/modules/session/session.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    await setSessionStatus(session.businessId, id, parseSessionStatus(body));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
