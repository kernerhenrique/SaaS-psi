import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import {
  parseTemplateContent,
  parseTemplateKey,
  resetMessageTemplate,
  saveMessageTemplate,
} from "@/server/modules/message/message-template.service";

interface RouteParams {
  params: Promise<{ kind: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    const key = parseTemplateKey((await params).kind);
    const body = await request.json().catch(() => null);
    await saveMessageTemplate(session.businessId, key, parseTemplateContent(body, key));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Restaura o texto padrão. */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    await resetMessageTemplate(session.businessId, parseTemplateKey((await params).kind));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
