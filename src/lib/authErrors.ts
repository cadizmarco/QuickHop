/**
 * Central mapper from Supabase Auth errors (and related failures)
 * to clear, user-facing messages.
 *
 * Supabase Auth deliberately returns generic strings like
 * "Invalid login credentials" to avoid leaking account existence.
 * We keep that behaviour where appropriate, but surface all other
 * distinct failure modes (email not confirmed, banned, rate-limited,
 * network down, profile-layer issues, etc.) with specific messages
 * so the UI can help the user fix the problem.
 */

import type { AuthError } from '@supabase/supabase-js';

export type AuthErrorKind =
    | 'invalid_credentials'
    | 'email_not_confirmed'
    | 'user_banned'
    | 'user_not_found'
    | 'rate_limited'
    | 'weak_password'
    | 'email_in_use'
    | 'invalid_email'
    | 'network'
    | 'session_expired'
    | 'profile_missing'
    | 'profile_rls'
    | 'unknown';

export interface MappedAuthError {
    kind: AuthErrorKind;
    /** Short, user-facing headline for a toast. */
    title: string;
    /** Optional secondary/explanatory text. */
    description?: string;
    /** Original error for logging/debugging. */
    original?: unknown;
}

function asString(x: unknown): string {
    if (!x) return '';
    if (typeof x === 'string') return x;
    if (typeof x === 'object' && x !== null) {
        const anyX = x as { message?: unknown };
        if (typeof anyX.message === 'string') return anyX.message;
    }
    return '';
}

/**
 * Map any error thrown during auth/profile flow to a structured result.
 */
export function mapAuthError(err: unknown): MappedAuthError {
    const e = err as (AuthError & { code?: string; status?: number; name?: string }) | null | undefined;
    const message = asString(e);
    const code = (e?.code || '').toString();
    const status = typeof e?.status === 'number' ? e.status : undefined;
    const name = (e?.name || '').toString();

    // ----- Database / profile layer ------------------------------------
    // Postgres error codes come from PostgREST responses.
    const pgCode = (e as any)?.code as string | undefined;
    if (pgCode === 'PGRST116') {
        return {
            kind: 'profile_missing',
            title: 'Profile not found',
            description:
                'Your account exists but has no profile record. Please contact support or try signing up again.',
            original: err,
        };
    }
    if (pgCode === '42P17') {
        return {
            kind: 'profile_rls',
            title: 'Database configuration error',
            description:
                'Profile security policies are misconfigured. Please contact the administrator.',
            original: err,
        };
    }

    // ----- Supabase Auth known codes / messages ------------------------
    if (
        code === 'invalid_credentials' ||
        /invalid login credentials/i.test(message)
    ) {
        return {
            kind: 'invalid_credentials',
            title: 'Incorrect email or password',
            description: 'Double-check your email and password, then try again.',
            original: err,
        };
    }

    if (
        code === 'email_not_confirmed' ||
        /email not confirmed/i.test(message)
    ) {
        return {
            kind: 'email_not_confirmed',
            title: 'Email not verified',
            description:
                'Please confirm your email address. Check your inbox (and spam folder) for the verification link.',
            original: err,
        };
    }

    if (
        code === 'user_banned' ||
        /user (is )?banned|account .* (banned|suspended)/i.test(message)
    ) {
        return {
            kind: 'user_banned',
            title: 'Account suspended',
            description:
                'This account has been suspended. Please contact support for assistance.',
            original: err,
        };
    }

    if (code === 'user_not_found' || /user not found/i.test(message)) {
        return {
            kind: 'user_not_found',
            title: 'Account not found',
            description: 'No account is registered with that email address.',
            original: err,
        };
    }

    if (
        code === 'over_request_rate_limit' ||
        code === 'over_email_send_rate_limit' ||
        status === 429 ||
        /rate limit|too many requests|too many attempts/i.test(message)
    ) {
        return {
            kind: 'rate_limited',
            title: 'Too many attempts',
            description:
                'You have tried to log in too many times. Please wait a few minutes and try again.',
            original: err,
        };
    }

    if (
        code === 'weak_password' ||
        /password.*(?:should be|must be|too short|at least)/i.test(message)
    ) {
        return {
            kind: 'weak_password',
            title: 'Password too weak',
            description: 'Use at least 6 characters. Mix letters, numbers, and symbols for safety.',
            original: err,
        };
    }

    if (
        code === 'email_exists' ||
        code === 'user_already_exists' ||
        /already registered|already in use|duplicate key.*email/i.test(message)
    ) {
        return {
            kind: 'email_in_use',
            title: 'Email already registered',
            description: 'An account with this email already exists. Try logging in instead.',
            original: err,
        };
    }

    if (code === 'validation_failed' || /invalid (?:email|format)/i.test(message)) {
        return {
            kind: 'invalid_email',
            title: 'Invalid email address',
            description: 'Please enter a valid email address.',
            original: err,
        };
    }

    if (
        name === 'TypeError' && /fetch/i.test(message) ||
        /network|failed to fetch|offline/i.test(message)
    ) {
        return {
            kind: 'network',
            title: 'Network error',
            description: 'Please check your internet connection and try again.',
            original: err,
        };
    }

    if (code === 'session_not_found' || /jwt|session.*expired/i.test(message)) {
        return {
            kind: 'session_expired',
            title: 'Session expired',
            description: 'Your session has expired. Please log in again.',
            original: err,
        };
    }

    // ----- Fallback ----------------------------------------------------
    return {
        kind: 'unknown',
        title: 'Login failed',
        description: message || 'Something went wrong. Please try again.',
        original: err,
    };
}

/**
 * Convenience: produce an Error whose message is the mapped, human-readable
 * title + description. Useful where existing code just `throw new Error(msg)`s.
 */
export function toFriendlyError(err: unknown): Error & { kind: AuthErrorKind; description?: string } {
    const mapped = mapAuthError(err);
    const friendly = new Error(mapped.title) as Error & {
        kind: AuthErrorKind;
        description?: string;
    };
    friendly.kind = mapped.kind;
    friendly.description = mapped.description;
    return friendly;
}
