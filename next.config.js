/** @type {import('next').NextConfig} */
const nextConfig = {
    // Abilita App Router
    experimental: {
        // serverComponentsExternalPackages: ['@anthropic-ai/sdk']
    },
    // Ignora errori TypeScript in build (per sviluppo rapido)
    typescript: {
        ignoreBuildErrors: true
    },
    // Ignora errori ESLint in build
    eslint: {
        ignoreDuringBuilds: true
    }
}

module.exports = nextConfig
