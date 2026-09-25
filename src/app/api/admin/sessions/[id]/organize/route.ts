import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit";
import { handleApiError, rateLimitedResponse } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { AiUnavailableError, organizeDictation, parseTranscripts } from "@/server/modules/dictation/organize.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Cada chamada custa dinheiro: limita a 20 organizações a cada 10 minutos por conta.
const ORGANIZE_RATE_LIMIT = { limit: 20, windowMs: 10 * 60 * 1000 };

/** Organiza o texto ditado nos campos do prontuário (rascunho — nada é salvo aqui). */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;

    const limit = checkRateLimit(`organize:${session.businessId}`, ORGANIZE_RATE_LIMIT);
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

    const body = await request.json().catch(() => null);
    const draft = await organizeDictation(session.businessId, id, parseTranscripts(body));
    return NextResponse.json({ draft });
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return handleApiError(error);
  }
}
