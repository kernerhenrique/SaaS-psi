export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Chama uma rota da API e devolve sucesso ou uma mensagem de erro pronta
 * para mostrar à psicóloga (nunca lança: a tela decide como exibir).
 */
export async function apiRequest<T = unknown>(
  url: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) return { ok: false, error: "Sua sessão expirou. Entre novamente." };
      return { ok: false, error: data?.error ?? "Não foi possível salvar. Tente de novo." };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "Sem conexão com o servidor. Verifique a internet e tente de novo." };
  }
}
