import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer', 'puppeteer-core', 'ws', 'lighthouse', 'bufferutil', 'utf-8-validate'],
}

export default nextConfig
