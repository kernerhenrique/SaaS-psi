import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Indicador do Next (só em dev) no canto direito, para não cobrir os botões do rodapé da sidebar.
  devIndicators: { position: "bottom-right" },
  // O Prisma carrega o binário do Query Engine dinamicamente (não via
  // import/require estático), então o rastreamento automático de arquivos
  // do Next não o inclui sozinho no pacote da função serverless.
  outputFileTracingIncludes: {
    "/*": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
