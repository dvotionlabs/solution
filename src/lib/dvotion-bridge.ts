import { timingSafeEqual } from 'node:crypto';

// Internal bridge credentials are only stored on the DVOTION and CGP servers.
export function dvotionBridgeAuthorised(request: Request): boolean {
  const expected = process.env.DVOTION_CGP_BRIDGE_SECRET;
  const supplied = request.headers.get('x-dvotion-bridge-secret');
  if (!expected || !supplied || expected.length < 32 || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied, 'utf8'), Buffer.from(expected, 'utf8'));
}
