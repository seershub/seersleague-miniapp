/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'www.thesportsdb.com',
      'league.seershub.com',
      'crests.football-data.org'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'crests.football-data.org',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: true, // Disable Next.js image optimization for external images
  },
  async redirects() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination: '/api/farcaster',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
