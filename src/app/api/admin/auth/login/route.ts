import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit, getClientIp, LOGIN_RATE_LIMIT } from "@/lib/rate-limit";
import { ValidationError } from "@/server/errors";
import { rateLimitedResponse } from "@/server/http";
import { login } from "@/server/modules/auth/auth.service";
import { setAuthCookies } from "@/server/modules/auth/cookies";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : null;
  const password = typeof body?.password === "string" ? body.password : null;

  if (!email || !password) {
    return NextResponse.json({ error: "Informe e-mail e senha" }, { status: 400 });
  }

  const rateLimit = checkRateLimit(
    `login:${getClientIp(request.headers)}:${email.trim().toLowerCase()}`,
    LOGIN_RATE_LIMIT,
  );
  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.retryAfterSeconds);
  }

  try {
    const { user, tokens } = await login(email, password);
    const response = NextResponse.json({ user });
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }
}
