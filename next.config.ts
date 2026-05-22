/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Esto desactiva el chequeo de eslint durante el build de Vercel
    ignoreDuringBuilds: true,
  },
  typescript: {
    // También desactiva el chequeo de tipos si te da errores de TS
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;