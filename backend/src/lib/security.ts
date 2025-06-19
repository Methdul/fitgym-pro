import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Hash a PIN using bcrypt
 * @param pin - The plain text PIN (4 digits)
 * @returns Promise<string> - The hashed PIN
 */
export const hashPin = async (pin: string): Promise<string> => {
  if (!pin || !/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits');
  }
  
  return await bcrypt.hash(pin, SALT_ROUNDS);
};

/**
 * Verify a PIN against its hash
 * @param pin - The plain text PIN to verify
 * @param hashedPin - The stored hashed PIN
 * @returns Promise<boolean> - True if PIN matches
 */
export const verifyPin = async (pin: string, hashedPin: string): Promise<boolean> => {
  if (!pin || !hashedPin) {
    return false;
  }
  
  if (!/^\d{4}$/.test(pin)) {
    return false;
  }
  
  try {
    return await bcrypt.compare(pin, hashedPin);
  } catch (error) {
    console.error('PIN verification error:', error);
    return false;
  }
};

/**
 * Validate PIN format and strength
 * @param pin - The PIN to validate
 * @returns Object with validation result and error message
 */
export const validatePin = (pin: string): { isValid: boolean; error?: string } => {
  if (!pin) {
    return { isValid: false, error: 'PIN is required' };
  }
  
  if (!/^\d{4}$/.test(pin)) {
    return { isValid: false, error: 'PIN must be exactly 4 digits' };
  }
  
  // Check for weak PINs (common patterns)
  const weakPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123', '3210'];
  if (weakPins.includes(pin)) {
    return { isValid: false, error: 'PIN is too weak. Avoid sequential or repeated digits' };
  }
  
  return { isValid: true };
};

/**
 * Rate limiting store for PIN attempts
 * In production, use Redis or similar distributed cache
 */
class PinAttemptTracker {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if PIN attempts are allowed for a staff member
   * @param staffId - The staff member ID
   * @returns Object with allowed status and remaining attempts
   */
  checkAttempts(staffId: string): { allowed: boolean; remainingAttempts: number; lockedUntil?: Date } {
    const now = Date.now();
    const record = this.attempts.get(staffId);
    
    if (!record) {
      return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS };
    }
    
    // Reset if enough time has passed
    if (now - record.lastAttempt > this.ATTEMPT_WINDOW) {
      this.attempts.delete(staffId);
      return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS };
    }
    
    // Check if locked out
    if (record.count >= this.MAX_ATTEMPTS) {
      const lockoutEnd = record.lastAttempt + this.LOCKOUT_DURATION;
      if (now < lockoutEnd) {
        return { 
          allowed: false, 
          remainingAttempts: 0, 
          lockedUntil: new Date(lockoutEnd) 
        };
      } else {
        // Lockout expired, reset
        this.attempts.delete(staffId);
        return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS };
      }
    }
    
    return { 
      allowed: true, 
      remainingAttempts: this.MAX_ATTEMPTS - record.count 
    };
  }
  
  /**
   * Record a failed PIN attempt
   * @param staffId - The staff member ID
   */
  recordFailedAttempt(staffId: string): void {
    const now = Date.now();
    const record = this.attempts.get(staffId);
    
    if (!record || now - record.lastAttempt > this.ATTEMPT_WINDOW) {
      this.attempts.set(staffId, { count: 1, lastAttempt: now });
    } else {
      record.count++;
      record.lastAttempt = now;
    }
  }
  
  /**
   * Reset attempts for a staff member (on successful login)
   * @param staffId - The staff member ID
   */
  resetAttempts(staffId: string): void {
    this.attempts.delete(staffId);
  }
  
  /**
   * Clean up old entries (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.LOCKOUT_DURATION;
    
    for (const [staffId, record] of this.attempts.entries()) {
      if (record.lastAttempt < cutoff) {
        this.attempts.delete(staffId);
      }
    }
  }
}

// Singleton instance for the application
export const pinAttemptTracker = new PinAttemptTracker();

// Clean up old entries every 30 minutes
setInterval(() => {
  pinAttemptTracker.cleanup();
}, 30 * 60 * 1000);