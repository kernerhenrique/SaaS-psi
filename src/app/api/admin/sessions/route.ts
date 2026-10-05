import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { parseCreateSessionInput } from "@/server/modules/session/session.parse";
import { createRecurringSessions, createSession } from "@/server/modules/session/session.service";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await request.json().catch(() => null);
    const input = parseCreateSessionInput(body);

    if (input.repeatWeeks && input.repeatWeeks > 1) {
      const created = await createRecurringSessions(session.businessId, input, input.repeatWeeks);
      return NextResponse.json({ sessions: created.ids }, { status: 201 });
    }

    const created = await createSession(session.businessId, input);
    return NextResponse.json({ session: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
