import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The pipeline's JSON outputs are read with fs at request time; include
  // them in every serverless function bundle so deployed routes can see them.
  outputFileTracingIncludes: {
    "/**": ["./data/**/*"],
  },
};

export default nextConfig;
