import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { setPaymentReminderDays } from "@/server/modules/message/message-template.service";

/** Após quantos dias de pagamento pendente o sistema sugere a mensagem de cobrança. */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await request.json().catch(() => null);
    await setPaymentReminderDays(session.businessId, body?.days);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
