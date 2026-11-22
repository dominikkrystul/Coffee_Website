import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";

const config: NextConfig = {
  agentRules: false,
  devIndicators: false,
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
};

export default function nextConfig(phase: string): NextConfig {
  if (phase !== PHASE_DEVELOPMENT_SERVER) return config;

  const privateIPv4 = /^(?:10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;
  const allowedDevOrigins = Object.values(networkInterfaces()).flatMap((addresses) =>
    (addresses ?? [])
      .filter(({ family, internal, address }) => family === "IPv4" && !internal && privateIPv4.test(address))
      .map(({ address }) => address),
  );

  return { ...config, allowedDevOrigins };
}
