// Facebook Token Management Service
// Handles System User tokens (permanent, never-expiring tokens)

interface TokenData {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
  tokenType: 'short' | 'long' | 'page' | 'system';
}

export class FacebookTokenManager {
  private static instance: FacebookTokenManager;
  private tokenData: TokenData | null = null;
  private appId: string;
  private appSecret: string;
  private refreshInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.appId = process.env.FACEBOOK_APP_ID || '';
    this.appSecret = process.env.FACEBOOK_APP_SECRET || '';
    
    if (!this.appId || !this.appSecret) {
      console.warn('⚠️  Facebook App ID or Secret not configured');
    }
  }

  static getInstance(): FacebookTokenManager {
    if (!FacebookTokenManager.instance) {
      FacebookTokenManager.instance = new FacebookTokenManager();
    }
    return FacebookTokenManager.instance;
  }

  // Initialize with existing token and detect type
  async initialize(initialToken: string): Promise<void> {
    try {
      console.log('🔄 Initializing Facebook token manager...');
      
      // First, check if this is a system user token (permanent)
      const tokenInfo = await this.getTokenInfo(initialToken);
      
      if (tokenInfo.isSystemUser) {
        // System user token - permanent, never expires
        this.tokenData = {
          accessToken: initialToken,
          expiresAt: Number.MAX_SAFE_INTEGER, // Never expires
          tokenType: 'system'
        };
        
        console.log('✅ System User token detected - permanent access enabled');
        return;
      }
      
      // Try to exchange for long-lived token
      const longLivedToken = await this.exchangeForLongLivedToken(initialToken);
      
      if (longLivedToken) {
        this.tokenData = {
          accessToken: longLivedToken.access_token,
          expiresAt: Date.now() + (longLivedToken.expires_in * 1000),
          tokenType: 'long'
        };
        
        console.log('✅ Successfully obtained long-lived token');
        this.startAutoRefresh();
      } else {
        // Fall back to short-lived token
        this.tokenData = {
          accessToken: initialToken,
          expiresAt: Date.now() + (3600 * 1000), // 1 hour
          tokenType: 'short'
        };
        
        console.log('⚠️  Using short-lived token as fallback');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Facebook token manager:', error);
      throw error;
    }
  }

  // Exchange short-lived token for long-lived token (60 days)
  private async exchangeForLongLivedToken(shortLivedToken: string): Promise<any> {
    if (!this.appId || !this.appSecret) {
      throw new Error('Facebook App ID and Secret required for token exchange');
    }

    try {
      const url = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.appId}&client_secret=${this.appSecret}&fb_exchange_token=${shortLivedToken}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ Token exchange failed:', data);
        return null;
      }
      
      console.log('✅ Token exchange successful');
      return data;
    } catch (error) {
      console.error('❌ Error during token exchange:', error);
      return null;
    }
  }

  // Get current valid token (refreshes if needed)
  async getValidToken(): Promise<string> {
    if (!this.tokenData) {
      throw new Error('Token manager not initialized');
    }

    // System user tokens never expire
    if (this.tokenData.tokenType === 'system') {
      return this.tokenData.accessToken;
    }

    // Check if token is still valid (with 10 minute buffer)
    const isExpiringSoon = this.tokenData.expiresAt - Date.now() < (10 * 60 * 1000);
    
    if (isExpiringSoon) {
      console.log('🔄 Token expiring soon, attempting refresh...');
      await this.refreshToken();
    }

    return this.tokenData.accessToken;
  }

  // Refresh the current token
  private async refreshToken(): Promise<void> {
    if (!this.tokenData) {
      throw new Error('No token data available for refresh');
    }

    try {
      if (this.tokenData.tokenType === 'long') {
        // For long-lived tokens, we need to exchange again
        const refreshed = await this.exchangeForLongLivedToken(this.tokenData.accessToken);
        
        if (refreshed) {
          this.tokenData = {
            accessToken: refreshed.access_token,
            expiresAt: Date.now() + (refreshed.expires_in * 1000),
            tokenType: 'long'
          };
          console.log('✅ Long-lived token refreshed successfully');
        } else {
          console.warn('⚠️  Failed to refresh long-lived token');
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing token:', error);
      throw error;
    }
  }

  // Start automatic token refresh (runs every 24 hours)
  private startAutoRefresh(): void {
    // Don't start auto-refresh for system user tokens (they never expire)
    if (this.tokenData?.tokenType === 'system') {
      console.log('✅ System user token detected - no auto-refresh needed');
      return;
    }

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Refresh every 24 hours
    this.refreshInterval = setInterval(async () => {
      try {
        console.log('🔄 Running scheduled token refresh...');
        await this.refreshToken();
      } catch (error) {
        console.error('❌ Scheduled token refresh failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    console.log('✅ Auto-refresh scheduled (every 24 hours)');
  }

  // Stop auto-refresh
  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('🛑 Auto-refresh stopped');
    }
  }

  // Check token status
  getTokenStatus(): { isValid: boolean; expiresAt: number; tokenType: string } {
    if (!this.tokenData) {
      return { isValid: false, expiresAt: 0, tokenType: 'none' };
    }

    const isValid = this.tokenData.expiresAt > Date.now();
    
    return {
      isValid,
      expiresAt: this.tokenData.expiresAt,
      tokenType: this.tokenData.tokenType
    };
  }

  // Get token information and detect type
  private async getTokenInfo(token: string): Promise<{ isSystemUser: boolean; expiresAt?: number }> {
    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${token}&access_token=${token}`);
      const data = await response.json();
      
      if (data.data) {
        const tokenData = data.data;
        
        // Check if token never expires (system user token)
        const isSystemUser = !tokenData.expires_at || tokenData.expires_at === 0;
        
        return {
          isSystemUser,
          expiresAt: tokenData.expires_at
        };
      }
      
      return { isSystemUser: false };
    } catch (error) {
      console.error('❌ Failed to get token info:', error);
      return { isSystemUser: false };
    }
  }

  // Test token validity
  async testToken(): Promise<boolean> {
    try {
      const token = await this.getValidToken();
      const response = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${token}`);
      const data = await response.json();
      
      if (response.ok && data.id) {
        console.log('✅ Token test successful');
        return true;
      } else {
        console.error('❌ Token test failed:', data);
        return false;
      }
    } catch (error) {
      console.error('❌ Token test error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const facebookTokenManager = FacebookTokenManager.getInstance();