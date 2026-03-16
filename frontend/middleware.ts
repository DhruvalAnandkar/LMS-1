import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const isDev = process.env.NODE_ENV === 'development';
  const scriptSrc = ["'self'", `'nonce-${nonce}'`];
  if (isDev) {
    scriptSrc.push("'unsafe-eval'", "'unsafe-inline'");
  }
  const connectSrc: string[] = ["'self'"];
  if (isDev) {
    connectSrc.push('http://localhost:8000');
  }
  const apiOrigin =
    process.env.NEXT_PUBLIC_API_ORIGIN || process.env.NEXT_PUBLIC_API_URL;
  if (apiOrigin) {
    try {
      connectSrc.push(new URL(apiOrigin).origin);
    } catch {
      // Ignore invalid URL values.
    }
  }
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: https:",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data: https:",
    `connect-src ${connectSrc.join(' ')}`,
    "frame-ancestors 'none'",
  ].join('; ');

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', nonce);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
