export interface EccalUser {
  id: string;
  email: string;
  name: string;
  membership?: string;
  credits?: number;
}

export interface EccalAuthConfig {
  baseUrl: string;
  siteName: string;
  onLogin?: (user: EccalUser) => void;
  onLogout?: () => void;
  onError?: (error: Error) => void;
}

export class EccalAuth {
  private config: EccalAuthConfig;
  private tokenKey = 'eccal_token';
  private userKey = 'eccal_user';

  constructor(config: EccalAuthConfig) {
    this.config = config;
  }

  // Google SSO 登入
  async googleLogin(service = 'audai'): Promise<void> {
    const params = new URLSearchParams({
      service: service,
      origin: window.location.origin,
      returnTo: window.location.href
    });
    
    window.location.href = `${this.config.baseUrl}/api/sso/login?${params}`;
  }

  // 驗證 JWT Token
  async verifyToken(token: string): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/sso/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({ token })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Token verification failed:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // 獲取用戶資料
  async getUserData(userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/account-center/user/${userId}`, {
        headers: { 'Origin': window.location.origin }
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // 扣除用戶點數
  async deductCredits(userId: string, amount: number, reason: string, service: string): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/account-center/credits/${userId}/deduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          amount: amount,
          reason: reason,
          service: service
        })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Credit deduction failed:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async checkAuth(): Promise<EccalUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const result = await this.verifyToken(token);
      
      if (result.success && result.valid) {
        // 獲取完整用戶資料
        const userData = await this.getUserData(result.user.id);
        
        if (userData.success) {
          const user = userData.user;
          this.setUser(user);
          return user;
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.clearAuth();
    }

    return null;
  }

  login(): void {
    this.googleLogin('audai');
  }

  logout(): void {
    this.clearAuth();
    if (this.config.onLogout) {
      this.config.onLogout();
    }
  }

  getCurrentUser(): EccalUser | null {
    const userJson = localStorage.getItem(this.userKey);
    return userJson ? JSON.parse(userJson) : null;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  setUser(user: EccalUser): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  handleCallback(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (error) {
      console.error('Auth error:', error);
      if (this.config.onError) {
        this.config.onError(new Error(error));
      }
      return;
    }

    if (token) {
      this.setToken(token);
      this.checkAuth().then(user => {
        if (user && this.config.onLogin) {
          this.config.onLogin(user);
        }
      });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  async getUserDetails(userId: string): Promise<EccalUser | null> {
    const userData = await this.getUserData(userId);
    return userData.success ? userData.user : null;
  }
}

export const eccalAuth = new EccalAuth({
  baseUrl: 'https://eccal.thinkwithblack.com',
  siteName: 'audai',
  onLogin: (user) => {
    console.log('User logged in:', user);
  },
  onLogout: () => {
    console.log('User logged out');
  },
  onError: (error) => {
    console.error('Auth error:', error);
  }
});