import os from "node:os";
import type { NextRequest } from "next/server";

export function normalizeIp(raw: string | null | undefined): string {
  if (!raw) return "";
  let ip = raw.split(",")[0]?.trim() ?? "";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip.startsWith("[") && ip.includes("]")) {
    ip = ip.slice(1, ip.indexOf("]"));
  }
  const zoneIndex = ip.indexOf("%");
  if (zoneIndex !== -1) ip = ip.slice(0, zoneIndex);
  return ip;
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-client-ip");
  const chain = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");
  const cf = request.headers.get("cf-connecting-ip");
  const candidate = forwarded ?? chain ?? real ?? cf ?? "";
  const normalized = normalizeIp(candidate);
  return normalized || "::1";
}

export function isLoopback(ip: string): boolean {
  const value = normalizeIp(ip);
  return (
    value === "::1" ||
    value === "localhost" ||
    value.startsWith("127.") ||
    value === "0.0.0.0"
  );
}

export function isPrivateIp(ip: string): boolean {
  const value = normalizeIp(ip);
  if (!value) return false;
  if (isLoopback(value)) return true;

  if (value.includes(":")) {
    const lower = value.toLowerCase();
    return (
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe8") ||
      lower.startsWith("fe9") ||
      lower.startsWith("fea") ||
      lower.startsWith("feb")
    );
  }

  const parts = value.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function ipv4Prefix(ip: string, octets: number): string | null {
  const value = normalizeIp(ip);
  if (value.includes(":")) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  return parts.slice(0, octets).join(".");
}

function ipv6Prefix(ip: string, groups: number): string | null {
  const value = normalizeIp(ip).toLowerCase();
  if (!value.includes(":")) return null;
  return value.split(":").slice(0, groups).join(":");
}

export function sameSubnet(a: string, b: string): boolean {
  const a4 = ipv4Prefix(a, 3);
  const b4 = ipv4Prefix(b, 3);
  if (a4 && b4) return a4 === b4;

  const a6 = ipv6Prefix(a, 4);
  const b6 = ipv6Prefix(b, 4);
  if (a6 && b6) return a6 === b6;

  return false;
}

export function isAllowedClient(clientIp: string, hostIp: string): boolean {
  const client = normalizeIp(clientIp);
  const host = normalizeIp(hostIp);

  if (isLoopback(client)) return true;
  if (!isPrivateIp(client)) return false;
  if (!host || isLoopback(host)) return true;
  return sameSubnet(client, host);
}

const VIRTUAL_INTERFACE =
  /(vEthernet|virtual|vmware|virtualbox|hyper-v|wsl|docker|loopback|teredo|isatap|tailscale|zerotier|br-|veth)/i;

export function getLanIp(): string | null {
  const interfaces = os.networkInterfaces();
  const candidates: { address: string; score: number }[] = [];

  for (const [name, entries] of Object.entries(interfaces)) {
    if (VIRTUAL_INTERFACE.test(name)) continue;
    for (const entry of entries ?? []) {
      if (entry.internal || entry.family !== "IPv4") continue;
      const address = entry.address;
      if (address.startsWith("169.254.")) continue;
      let score = 0;
      if (address.startsWith("192.168.")) score = 40;
      else if (address.startsWith("10.")) score = 30;
      else if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) score = 20;
      else if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(address)) score = 15;
      else score = 1;
      candidates.push({ address, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.address ?? null;
}

function splitHost(host: string): { hostname: string; port: string } {
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return {
      hostname: host.slice(1, end),
      port: host.slice(end + 1).replace(/^:/, ""),
    };
  }
  const lastColon = host.lastIndexOf(":");
  if (lastColon !== -1 && host.indexOf(":") === lastColon) {
    return { hostname: host.slice(0, lastColon), port: host.slice(lastColon + 1) };
  }
  return { hostname: host, port: "" };
}

export function getBaseUrl(request: NextRequest): string {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
  const hostHeader = request.headers.get("host") || "localhost:3000";
  return resolveBaseUrl(hostHeader, proto);
}

export function resolveBaseUrl(hostHeader: string, proto = "http"): string {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const { hostname, port } = splitHost(hostHeader);
  const lanIp = getLanIp();

  if (lanIp && (isLoopback(hostname) || hostname === "0.0.0.0")) {
    return `${proto}://${lanIp}${port ? `:${port}` : ""}`;
  }

  return `${proto}://${hostHeader}`;
}

export function getHostAddress(request: NextRequest): string {
  const client = getClientIp(request);
  if (!isLoopback(client)) return client;
  return getLanIp() ?? client;
}
