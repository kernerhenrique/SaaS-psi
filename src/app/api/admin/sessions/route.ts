import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { parseCreateSessionInput } from "@/server/modules/session/session.parse";
import { createSession } from "@/server/modules/session/session.service";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await request.json().catch(() => null);
    const created = await createSession(session.businessId, parseCreateSessionInput(body));
    return NextResponse.json({ session: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
