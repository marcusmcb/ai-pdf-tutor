/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias['pdfjs-dist/build/pdf'] = 'pdfjs-dist/build/pdf.js';
      config.resolve.alias['pdfjs-dist/build/pdf.worker'] = 'pdfjs-dist/build/pdf.worker.js';
    }
    return config;
  },
};

module.exports = nextConfig;
