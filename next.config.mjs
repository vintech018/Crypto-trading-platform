/** @type {import('next').NextConfig} */

const nextConfig = {
    reactStrictMode: true,

    // Preserve build stability — lint/TS errors are caught separately
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },

    // Allow images from external sources used by the app
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'cryptologos.cc',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'assets.coingecko.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'api.dicebear.com',
                port: '',
                pathname: '/**',
            },
        ],
    },
};

export default nextConfig;
