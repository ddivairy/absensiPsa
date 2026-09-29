import app from '../server/index';

// Catch-all handler for root /api requests on Vercel
export default function handler(req: any, res: any) {
  try {
    const originalUrl: string = typeof req.url === 'string' ? req.url : '/';
    const [pathname, query] = originalUrl.split('?');
    if (pathname === '/' || pathname === '') {
      req.url = query ? `/?${query}` : '/';
    } else if (!pathname.startsWith('/api/') && pathname !== '/api') {
      req.url = `/api${pathname}${query ? `?${query}` : ''}`;
    }
  } catch {
    // Fall through to Express default handling.
  }
  return (app as any)(req, res);
}
