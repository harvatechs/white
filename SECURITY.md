# Security Policy

WHITE Search is engineered with a privacy-first, security-hardened architecture.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

---

## Security Architecture & Defenses

1. **SSRF Protections (`src/lib/security.ts`)**:
   - Strictly validates all external URLs accessed by `/api/preview`, `/api/summarize`, and custom bangs.
   - Blocks private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`).
   - Rejects cloud instance metadata endpoints (`metadata.google.internal`, `169.254.169.254`).
   - Disallows dangerous schemes (`javascript:`, `file:`, `data:`, `gopher:`).

2. **Rate Limiting (`src/lib/rate-limit.ts`)**:
   - Built-in sliding-window in-memory rate limiter per IP address to safeguard self-hosted instances from DDoS and scraping abuse.

3. **HTTP Security Headers (`next.config.ts`)**:
   - `X-Frame-Options: DENY` (prevents clickjacking).
   - `X-Content-Type-Options: nosniff` (prevents MIME sniffing).
   - `Referrer-Policy: strict-origin-when-cross-origin`.
   - `Strict-Transport-Security` (enforces HTTPS).
   - `Permissions-Policy: camera=(), geolocation=(), microphone=(self)`.

4. **Zero-Tracking Architecture**:
   - All session data (history, bookmarks, preferences) is keyed to an anonymous UUID stored solely in your own browser's cookie.
   - We do not store IP addresses, device fingerprints, or advertising IDs.

---

## Reporting a Vulnerability

If you discover a potential security vulnerability in WHITE Search, please report it responsibly by contacting the maintainers privately or creating a private security advisory on GitHub.

Please include:
- A description of the issue and potential impact.
- Step-by-step reproduction instructions or proof of concept.

We will review and respond to reports within 48 hours and work with you to patch the vulnerability before public disclosure.
