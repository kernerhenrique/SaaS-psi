"use client";

import { useEffect } from "react";

// O token de acesso dura 15 min (src/server/modules/auth/tokens.ts). Renova
// em segundo plano a cada 10 min, enquanto a aba estiver aberta, para a
// sessão nunca cair durante o uso normal. Se falhar (ex.: token de
// renovação de 7 dias expirou), simplesmente para — a próxima navegação cai
// no login normalmente.
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

export function SessionKeepAlive() {
  useEffect(() => {
    const id = setInterval(() => {
      fetch("/api/admin/auth/refresh", { method: "POST" }).catch(() => {});
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
