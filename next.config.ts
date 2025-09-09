import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      '**/*.{jsx,tsx,js,ts,mjs,mts}': {
        loaders: [{
          loader: './minimal-loader.js',
          options: {}
        }]
      }
    }
  }
};

export default nextConfig;
