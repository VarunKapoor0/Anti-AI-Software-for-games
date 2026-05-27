/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.akamai.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "cdn.cloudflare.steamstatic.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/api/openapi.json",
        destination: "/api/openapi",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
