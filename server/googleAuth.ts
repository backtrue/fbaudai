// Google OAuth 認證服務
import { OAuth2Client } from 'google-auth-library';

export class GoogleAuthService {
  private oauth2Client: OAuth2Client;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID!;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    
    // 根據環境設定重定向 URI
    if (process.env.NODE_ENV === 'development') {
      // 開發環境使用當前 Replit 域名
      this.redirectUri = `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
    } else {
      // 生產環境設定
      this.redirectUri = 'https://audai.thinkwithblack.com/api/auth/google/callback';
    }

    this.oauth2Client = new OAuth2Client(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );
  }

  // 生成 Google OAuth 認證 URL
  generateAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      state: JSON.stringify({
        service: 'audai',
        timestamp: Date.now()
      })
    });
  }

  // 驗證 Google OAuth 回調
  async verifyCallback(code: string): Promise<{
    email: string;
    name: string;
    picture?: string;
  } | null> {
    try {
      console.log('Getting tokens from Google...');
      const { tokens } = await this.oauth2Client.getToken(code);
      console.log('Tokens received:', tokens ? 'Success' : 'Failed');
      
      this.oauth2Client.setCredentials(tokens);

      console.log('Verifying ID token...');
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: this.clientId
      });

      const payload = ticket.getPayload();
      console.log('Token payload:', payload ? 'Success' : 'Failed');
      
      if (!payload) {
        console.log('No payload in token');
        return null;
      }

      console.log('User data extracted:', {
        email: payload.email,
        name: payload.name,
        picture: payload.picture ? 'Yes' : 'No'
      });

      return {
        email: payload.email!,
        name: payload.name!,
        picture: payload.picture
      };
    } catch (error) {
      console.error('Google OAuth 驗證失敗:', error);
      return null;
    }
  }

  // 驗證 Google ID Token
  async verifyIdToken(idToken: string): Promise<{
    email: string;
    name: string;
    picture?: string;
  } | null> {
    try {
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken,
        audience: this.clientId
      });

      const payload = ticket.getPayload();
      if (!payload) return null;

      return {
        email: payload.email!,
        name: payload.name!,
        picture: payload.picture
      };
    } catch (error) {
      console.error('ID Token 驗證失敗:', error);
      return null;
    }
  }
}

export const googleAuthService = new GoogleAuthService();