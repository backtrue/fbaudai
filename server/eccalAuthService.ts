// EccalAuth 服務整合
// 與主認證中心 eccal.thinkwithblack.com 的 API 通信

interface EccalUser {
  id: string;
  email: string;
  name: string;
  membership?: string;
  credits?: number;
}

export class EccalAuthService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    // 使用主認證中心進行統合認證
    this.baseUrl = process.env.ECCAL_AUTH_BASE_URL || 'https://eccal.thinkwithblack.com';
    this.apiKey = process.env.ECCAL_API_KEY || '';
  }

  // 驗證 JWT token 的有效性
  async verifyToken(token: string): Promise<EccalUser | null> {
    try {
      console.log('正在驗證 JWT token...');
      
      const response = await fetch(`${this.baseUrl}/api/sso/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        console.error('Token 驗證失敗:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      console.log('Token 驗證成功，用戶資料:', data.user);
      
      // 確保回傳的用戶資料包含會員資訊
      if (data.user) {
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          membership: data.user.membership || 'Free',
          credits: data.user.credits || 0
        };
      }
      
      return null;
    } catch (error) {
      console.error('驗證 token 時發生錯誤:', error);
      return null;
    }
  }

  // 刷新 JWT token
  async refreshToken(refreshToken: string): Promise<{ token: string; user: EccalUser } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sso/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        console.error('Token 刷新失敗:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      return {
        token: data.token,
        user: data.user
      };
    } catch (error) {
      console.error('刷新 token 時發生錯誤:', error);
      return null;
    }
  }

  // 獲取用戶詳細資訊
  async getUserDetails(userId: string): Promise<EccalUser | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/account-center/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        console.error('獲取用戶資訊失敗:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      return data.user || null;
    } catch (error) {
      console.error('獲取用戶資訊時發生錯誤:', error);
      return null;
    }
  }

  // 獲取用戶會員資訊
  async getMembershipInfo(userId: string): Promise<{ membership: string; credits: number } | null> {
    try {
      console.log('正在從 eccal 獲取用戶會員資訊:', userId);
      
      // 使用已修復的 API 端點獲取用戶詳細資訊
      const response = await fetch(`${this.baseUrl}/api/account-center/user/${userId}`, {
        headers: {
          'Origin': 'https://audai.thinkwithblack.com', // eccal 需要的 Origin header
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        console.error('獲取用戶會員資訊失敗:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      console.log('✅ Eccal 用戶資料回應:', data);
      
      if (data.success && data.user) {
        return {
          membership: data.user.membership || 'free',
          credits: data.user.credits || 0
        };
      }
      
      return null;
    } catch (error) {
      console.error('獲取會員資訊時發生錯誤:', error);
      return null;
    }
  }

  // 扣除用戶點數
  async deductCredits(userId: string, amount: number, reason: string): Promise<{ success: boolean; remainingCredits?: number; transactionId?: string }> {
    try {
      console.log(`正在扣除 ${userId} 的 ${amount} 點數，原因: ${reason}`);
      
      const response = await fetch(`${this.baseUrl}/api/account-center/credits/${userId}/deduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://audai.thinkwithblack.com',
        },
        body: JSON.stringify({
          amount,
          reason,
          service: 'audai' // 服務標識
        }),
      });

      if (!response.ok) {
        console.error('扣除點數失敗:', response.status, response.statusText);
        return { success: false };
      }

      const data = await response.json();
      console.log('✅ 點數扣除成功:', data);
      
      return {
        success: data.success,
        remainingCredits: data.remainingCredits,
        transactionId: data.transactionId
      };
    } catch (error) {
      console.error('扣除點數時發生錯誤:', error);
      return { success: false };
    }
  }
}

export const eccalAuthService = new EccalAuthService();