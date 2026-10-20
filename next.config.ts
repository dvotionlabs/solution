import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return ['performance', 'movement'].flatMap(service => [4, 8, 12].map(sessions => ({
      source: `/checkout/dvotion-${service}-dd${sessions}`,
      destination: `/checkout/dvotion-${service}-dd${sessions}-v2`,
      permanent: false,
    })));
  },
  async headers(){return [{source:"/sw.js",headers:[{key:"Cache-Control",value:"no-store, max-age=0"}]},{source:"/(.*)",headers:[{key:"Content-Security-Policy",value:"default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self'; manifest-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"},{key:"X-Content-Type-Options",value:"nosniff"},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},{key:"X-Frame-Options",value:"DENY"},{key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}]}]},
};

export default nextConfig;
