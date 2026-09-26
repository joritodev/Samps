/** @type {import('next').NextConfig} */

// Enforce: Tailwind/shadcn precisa de style inline; Next injeta script inline.
// Sem unsafe-eval — produção do Next 14 não usa eval().
const cspEnforce = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: cspEnforce },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // Painel de gestão
      { source: "/gestao", destination: "/painel-gestao", permanent: true },
      // Quadros de setor (visão geral do setor)
      { source: "/quadros/design", destination: "/setores/design", permanent: true },
      { source: "/quadros/video", destination: "/setores/video", permanent: true },
      { source: "/quadros/trafego", destination: "/setores/trafego", permanent: true },
      { source: "/quadros/social-media", destination: "/setores/social", permanent: true },
      // Painéis pessoais dos colaboradores
      { source: "/painel/design", destination: "/meu-painel/design", permanent: true },
      { source: "/painel/video", destination: "/meu-painel/video", permanent: true },
      { source: "/painel/social-media", destination: "/meu-painel/social", permanent: true },
      { source: "/painel/trafego", destination: "/meu-painel/trafego", permanent: true },
      // Rotas legacy do shell `(app)` — sunset #35
      { source: "/usuarios", destination: "/equipe", permanent: true },
      { source: "/relatorios", destination: "/performance", permanent: true },
      { source: "/calendario", destination: "/agenda", permanent: true },
    ];
  },
};

export default nextConfig;
