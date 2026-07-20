import type { NextConfig } from "next";

// H2/M12: nagłówki bezpieczeństwa dla panelu admin/HR.
// CSP celowo pominięte na tym etapie — Next.js wstrzykuje inline'owe skrypty
// (hydracja), które wymagają nonce/hash; wdrożenie CSP to osobny krok.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
