import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Indicador do Next (só em dev) no canto direito, para não cobrir os botões do rodapé da sidebar.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
