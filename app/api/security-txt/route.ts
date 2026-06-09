import { NextResponse } from "next/server";

export async function GET() {
  const securityTxt = `Contact: security@stockflow.com
Expires: 2025-12-31T23:59:59.000Z
Encryption: https://stockflow.com/pgp-key.txt
Preferred-Languages: en
Canonical: https://stockflow.com/.well-known/security.txt
Policy: https://stockflow.com/security-policy
Hiring: https://stockflow.com/careers

# Security Disclosure
# Please report security vulnerabilities to our security team.
# We appreciate responsible disclosure and will work with researchers
# to address any security issues promptly.

# Bug Bounty Program
# We offer rewards for security vulnerabilities depending on severity:
# - Critical: $1000-$5000
# - High: $500-$1000
# - Medium: $100-$500
# - Low: $50-$100

# Scope
# In scope:
# - Authentication and authorization bypasses
# - SQL injection, XSS, CSRF
# - Remote code execution
# - Privilege escalation
# - Data exposure issues

# Out of scope:
# - Social engineering attacks
# - Physical access attacks
# - Denial of service attacks
# - Reports from automated scanners without manual validation
`;

  return new NextResponse(securityTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400' // 24 hours
    }
  });
}