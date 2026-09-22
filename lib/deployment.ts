export const APPLICATION_ORIGIN = 'https://compliance-calender.vercel.app';

// The upstream Worker URL differs from the browser URL behind Vercel.
// Trust only this configured application origin, never forwarded host headers.
export function hasAllowedOrigin(req: Request) {
  const origin = req.headers.get('origin');
  return (
    origin === null ||
    origin === new URL(req.url).origin ||
    origin === APPLICATION_ORIGIN
  );
}
