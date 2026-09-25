import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { parseProfileInput, updateProfile } from "@/server/modules/settings/settings.service";

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await request.json().catch(() => null);
    await updateProfile(session.businessId, session.userId, parseProfileInput(body));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
