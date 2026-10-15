/**
 * Optional passcodes for the AI and sync routes. Set ACCESS_CODE in the server's environment when the
 * app is hosted on the internet, so strangers who find the address can't spend your AI quota.
 * Several people can share one server: list codes separated by commas, and each code keeps its own saved progress.
 * Leave it unset when running on your own Wi-Fi.
 */
const codes = () => (process.env.ACCESS_CODE ?? '').split(',').map((c: string) => c.trim()).filter(Boolean);

export const accessLocked = () => codes().length > 0;

/** The code a request carries (already checked by `denied`). */
export const accountOf = (request: Request) => (request.headers.get('x-access-code') ?? '').trim();

/** Returns a 401 response when a code is required and the request doesn't carry a valid one. */
export function denied(request: Request): Response | null {
  const list = codes();
  if (!list.length) return null;
  if (list.includes(accountOf(request))) return null;
  return Response.json({ error: 'This app needs an access code. Enter it on the Player tab, under Settings.', locked: true }, { status: 401 });
}
