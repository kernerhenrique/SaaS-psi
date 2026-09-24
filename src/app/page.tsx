import { redirect } from "next/navigation";

// Não há página pública: a raiz leva direto ao painel (o proxy manda para o login se preciso).
export default function Home() {
  redirect("/admin");
}
