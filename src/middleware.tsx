import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const responseHeaders = new Headers();
  responseHeaders.set('x-middleware-cache', 'no-cache');
  return;
}

export const config = {
  matcher: '/api/:path*',
};
