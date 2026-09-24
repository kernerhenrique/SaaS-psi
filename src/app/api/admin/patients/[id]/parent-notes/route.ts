import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getBusinessToday } from "@/server/modules/business/business.service";
import { parseParentNoteInput } from "@/server/modules/record/record.parse";
import { addParentNote } from "@/server/modules/record/record.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const input = parseParentNoteInput(body, await getBusinessToday(session.businessId));
    await addParentNote(session.businessId, id, input);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
