/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev && process.env.WATCHPACK_POLLING === "1") {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
      }
    }
    return config
  },
}

module.exports = nextConfig
