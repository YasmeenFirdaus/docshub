/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer uses Node APIs and must never be bundled for the browser
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
};

module.exports = nextConfig;
