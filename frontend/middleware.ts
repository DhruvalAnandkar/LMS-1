import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const isDev = process.env.NODE_ENV === 'development';
  const scriptSrc = ["'self'", `'nonce-${nonce}'`];
  if (isDev) {
    scriptSrc.push("'unsafe-eval'", "'unsafe-inline'");
  }
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: https:",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data: https:",
    "connect-src 'self' https: http:",
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
