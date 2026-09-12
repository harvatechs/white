// WHITE Search — Security & SSRF Protection Utility
// Hardened checks against SSRF, Open Redirects, and Protocol Injections.

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "ip6-localhost",
  "ip6-loopback",
  "metadata.google.internal",
  "169.254.169.254", // AWS/GCP/Azure link-local metadata
  "instance-data",
]);

const BLOCKED_EXTENSIONS = new Set([
  "local",
  "internal",
  "localhost",
  "lan",
  "corp",
  "home",
  "test",
  "example",
  "invalid",
  "arpa",
]);

// Check if an IPv4 address is in a private/reserved range
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((x) => parseInt(x, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  const [a, b] = parts;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 10.0.0.0/8 (Private)
  if (a === 10) return true;
  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (Link-local / Cloud metadata)
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  return false;
}

export function isSafeExternalUrl(inputUrl: string): boolean {
  if (!inputUrl || typeof inputUrl !== "string") return false;
  const trimmed = inputUrl.trim();

  // Reject dangerous protocols or obfuscations
  if (/^(javascript|data|vbscript|file|gopher|dict|ftp|ldap):/i.test(trimmed)) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  // Must strictly be HTTP or HTTPS
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase().trim();

  // Check known blocked hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return false;
  }

  // Check internal TLDs
  const lastDot = hostname.lastIndexOf(".");
  if (lastDot !== -1) {
    const tld = hostname.slice(lastDot + 1);
    if (BLOCKED_EXTENSIONS.has(tld)) {
      return false;
    }
  }

  // Check IPv4 addresses (including raw and private ranges)
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    if (isPrivateIPv4(hostname)) {
      return false;
    }
  }

  // Reject decimal / octal / hex encoded IPs (e.g., 2130706433 or 0x7f000001)
  if (/^(0x[0-9a-f]+|\d+)$/i.test(hostname)) {
    return false;
  }

  // Reject IPv6 brackets [::1], [fe80:...]
  if (hostname.startsWith("[") || hostname.includes(":")) {
    if (hostname.includes("fe80") || hostname.includes("fc00") || hostname === "[::1]" || hostname === "::1") {
      return false;
    }
  }

  return true;
}

export function isSafeBangUrl(urlTemplate: string): boolean {
  if (!urlTemplate || typeof urlTemplate !== "string") return false;
  const trimmed = urlTemplate.trim();

  // Must strictly start with http:// or https://
  if (!/^https?:\/\/[a-zA-Z0-9.-]+/i.test(trimmed)) {
    return false;
  }

  // Reject dangerous schemes
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return false;
  }

  return true;
}
