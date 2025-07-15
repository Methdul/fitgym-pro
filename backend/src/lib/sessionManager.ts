// Simple in-memory session storage (use Redis in production)
interface Session {
  staffId: string;
  branchId: string;
  role: string;
  createdAt: Date;
  expiresAt: Date;
}

class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private readonly SESSION_DURATION = 90 * 24 * 60 * 60 * 1000; // 90 days

  generateToken(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  createSession(staffId: string, branchId: string, role: string): string {
    const token = this.generateToken();
    const now = new Date();
    
    this.sessions.set(token, {
      staffId,
      branchId,
      role,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.SESSION_DURATION)
    });

    // Clean up expired sessions
    this.cleanupExpiredSessions();

    return token;
  }

  getSession(token: string): Session | null {
    const session = this.sessions.get(token);
    
    if (!session) return null;
    
    if (new Date() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }
    
    return session;
  }

  validateSession(token: string): boolean {
    return this.getSession(token) !== null;
  }

  deleteSession(token: string): void {
    this.sessions.delete(token);
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
      }
    }
  }
}

export const sessionManager = new SessionManager();