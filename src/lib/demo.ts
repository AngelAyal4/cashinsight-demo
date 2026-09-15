/**
 * Demo mode utilities for Cashinsight Demo.
 *
 * When NEXT_PUBLIC_DEMO_MODE=true, the app runs without authentication
 * and uses a demo user ID for all data operations.
 */

export const DEMO_USER_ID = 'demo-user-recruiter' as const;

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}
