/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    DATA_DIR: process.cwd() + '/../data',
  },
}

module.exports = nextConfig
