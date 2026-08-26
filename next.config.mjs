/** @type {import('next').NextConfig} */

// CSP entra em Report-Only nesta fase: o app usa estilos inline do Tailwind/shadcn
// e scripts do Next, então bloquear de primeira quebraria telas. Depois de checar
// os relatórios, a Fase 3 troca para Content-Security-Policy sem "-Report-Only".
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
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
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
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
    ];
  },
};

export default nextConfig;
