/**
 * Hash a PIN using bcrypt
 * @param pin - The plain text PIN (4 digits)
 * @returns Promise<string> - The hashed PIN
 */
export declare const hashPin: (pin: string) => Promise<string>;
/**
 * Verify a PIN against its hash
 * @param pin - The plain text PIN to verify
 * @param hashedPin - The stored hashed PIN
 * @returns Promise<boolean> - True if PIN matches
 */
export declare const verifyPin: (pin: string, hashedPin: string) => Promise<boolean>;
/**
 * Validate PIN format and strength
 * @param pin - The PIN to validate
 * @returns Object with validation result and error message
 */
export declare const validatePin: (pin: string) => {
    isValid: boolean;
    error?: string;
};
/**
 * Rate limiting store for PIN attempts
 * In production, use Redis or similar distributed cache
 */
declare class PinAttemptTracker {
    private attempts;
    private readonly MAX_ATTEMPTS;
    private readonly LOCKOUT_DURATION;
    private readonly ATTEMPT_WINDOW;
    /**
     * Check if PIN attempts are allowed for a staff member
     * @param staffId - The staff member ID
     * @returns Object with allowed status and remaining attempts
     */
    checkAttempts(staffId: string): {
        allowed: boolean;
        remainingAttempts: number;
        lockedUntil?: Date;
    };
    /**
     * Record a failed PIN attempt
     * @param staffId - The staff member ID
     */
    recordFailedAttempt(staffId: string): void;
    /**
     * Reset attempts for a staff member (on successful login)
     * @param staffId - The staff member ID
     */
    resetAttempts(staffId: string): void;
    /**
     * Clean up old entries (call periodically)
     */
    cleanup(): void;
}
export declare const pinAttemptTracker: PinAttemptTracker;
export {};
//# sourceMappingURL=security.d.ts.map