/**
 * Simple in-memory rate limiter for API endpoints
 * Limits requests per IP address within a time window
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (resets on server restart, which is fine for serverless)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT = 10; // requests
const WINDOW_MS = 60 * 1000; // 1 minute

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

/**
 * Check if a request should be rate limited
 * @param identifier - Usually the IP address or user ID
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // New window - allow and start counting
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return {
      allowed: true,
      remaining: RATE_LIMIT - 1,
      resetIn: WINDOW_MS,
    };
  }

  if (entry.count >= RATE_LIMIT) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    };
  }

  // Increment count and allow
  entry.count++;
  return {
    allowed: true,
    remaining: RATE_LIMIT - entry.count,
    resetIn: entry.resetTime - now,
  };
}

/**
 * Get the client IP address from request headers
 */
export function getClientIP(request: Request): string {
  // Try various headers used by proxies/load balancers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP if there are multiple
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback - in serverless environments this might not be available
  return 'unknown';
}

/**
 * Rate limit middleware helper
 * Returns a Response if rate limited, null otherwise
 */
export function rateLimitResponse(request: Request): Response | null {
  const ip = getClientIP(request);
  const { allowed, remaining, resetIn } = checkRateLimit(ip);

  if (!allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Please wait ${Math.ceil(resetIn / 1000)} seconds before trying again`,
        retryAfter: Math.ceil(resetIn / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': RATE_LIMIT.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(resetIn / 1000).toString(),
          'Retry-After': Math.ceil(resetIn / 1000).toString(),
        },
      }
    );
  }

  // Not rate limited - return null to continue processing
  return null;
}
