import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Trademark gate (spec §1.3): while PREVIEW_PASSWORD is set in the deploy
 * environment, the whole site sits behind basic auth, so nothing publishes
 * publicly under the Lemonhead name before clearance. Unset the variable to
 * open the site once the gate clears.
 */
export function middleware(request: NextRequest): NextResponse {
  const password = process.env.PREVIEW_PASSWORD;
  if (!password) return NextResponse.next();

  const header = request.headers.get('authorization') ?? '';
  const expected = `Basic ${Buffer.from(`lemonhead:${password}`).toString('base64')}`;
  if (header === expected) return NextResponse.next();

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Lemonhead preview"' },
  });
}
