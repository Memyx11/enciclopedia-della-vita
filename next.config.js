/** @type {import('next').NextConfig} */
const nextConfig = {
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
