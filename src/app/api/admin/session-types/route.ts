import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { createSessionType, parseSessionTypeInput } from "@/server/modules/settings/settings.service";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await request.json().catch(() => null);
    const sessionType = await createSessionType(session.businessId, parseSessionTypeInput(body));
    return NextResponse.json({ sessionType: { id: sessionType.id } }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
