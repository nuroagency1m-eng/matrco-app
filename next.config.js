/** @type {import('next').NextConfig} */
const nextConfig = {
    poweredByHeader: false,
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    // Todos los paquetes que Baileys usa con código nativo de Node.js
    experimental: {
        instrumentationHook: true,
        serverComponentsExternalPackages: [
            '@whiskeysockets/baileys',
            'pino',
            'pino-pretty',
            'ws',
            'bufferutil',
            'utf-8-validate',
            '@hapi/boom',
            'noise-handshake',
            'libsignal',
            'get-port',
        ],
    },

    async headers() {
        const securityHeaders = [
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
            {
                key: 'Content-Security-Policy',
                value: [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://player.vimeo.com",
                    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
                    "img-src 'self' data: blob: https:",
                    "connect-src 'self' https:",
                    "frame-src https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
                    "font-src 'self' data: https://cdnjs.cloudflare.com",
                ].join('; '),
            },
        ]
        return [
            // Headers en todas las páginas (sin X-Robots-Tag para que la landing sea indexable)
            { source: '/:path*', headers: securityHeaders },
            // X-Robots-Tag solo en rutas privadas — bots no deben indexar dashboard/admin/api
            { source: '/dashboard/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
            { source: '/admin/:path*',     headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
            { source: '/api/:path*',       headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
        ]
    },

    webpack: (config, { isServer }) => {
        if (isServer) {
            // Forzar que estos módulos sean tratados como externos aunque webpack los vea
            const nativeModules = [
                'bufferutil',
                'utf-8-validate',
                'ws',
                '@whiskeysockets/baileys',
                'pino',
            ]
            config.externals = [
                ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
                ...nativeModules,
            ]
        }
        return config
    },
}

module.exports = nextConfig
