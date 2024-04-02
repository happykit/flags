/** @type {import('next').NextConfig} */
const nextConfig = {
  // Config options here
};

const withVercelToolbar = require("@vercel/toolbar/plugins/next")();
// Instead of module.exports = nextConfig, do this:
module.exports = withVercelToolbar(nextConfig);
