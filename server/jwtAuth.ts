// JWT 共用認證系統
// 基於 EccalAuth 架構的認證中間件

import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

export interface JWTUser {
  id: string;
  email: string;
  name: string;
  membership?: string;
  credits?: number;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTUser;
}

// 確保用戶在本地資料庫中存在
export async function ensureUserExists(user: JWTUser): Promise<void> {
  try {
    console.log('檢查用戶是否存在於本地資料庫:', user.id);
    
    // 檢查用戶是否已存在
    const existingUser = await storage.getUser(user.id);
    
    if (!existingUser) {
      console.log('用戶不存在，正在創建新用戶記錄...');
      
      // 解析用戶名稱
      const nameParts = user.name ? user.name.split(' ') : ['Unknown', 'User'];
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'User';
      
      // 創建用戶記錄
      await storage.upsertUser({
        id: user.id,
        email: user.email,
        firstName,
        lastName,
        profileImageUrl: null
      });
      
      console.log('✅ 用戶記錄已創建:', user.id);
    } else {
      console.log('✅ 用戶已存在於本地資料庫:', user.id);
    }
  } catch (error) {
    console.error('❌ 確保用戶存在時發生錯誤:', error);
    throw error;
  }
}

// JWT 認證中間件
export const jwtAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 調試：打印所有可用的 cookies
    console.log('可用的 cookies:', req.cookies);
    console.log('Authorization header:', req.headers.authorization);
    
    // 調試：打印所有可能的 cookie 名稱
    const possibleCookieNames = ['auth_token', 'audai-jwt-token', 'auth-token', 'jwt-token', 'token'];
    console.log('檢查可能的 cookie 名稱:');
    possibleCookieNames.forEach(name => {
      console.log(`  ${name}: ${req.cookies?.[name] ? 'found' : 'not found'}`);
    });
    
    // 從 Authorization header 或 cookie 獲取 token
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      // 嘗試從 cookie 獲取 (使用正確的 cookie 名稱)
      token = req.cookies?.['auth_token'] || req.cookies?.['audai-jwt-token'] || req.cookies?.['auth-token'] || req.cookies?.['jwt-token'] || req.cookies?.['token'];
    }
    
    // 詳細記錄 token 查找結果
    console.log('找到的 token:', token ? 'found' : 'not found');
    if (token) {
      console.log('Token 來源:', req.headers.authorization ? 'Authorization header' : 'Cookie');
    }

    console.log('找到的 token:', token ? 'exists' : 'not found');

    if (!token) {
      res.status(401).json({ message: 'Unauthorized - No token provided' });
      return;
    }

    console.log('正在驗證 JWT token...');
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    
    // 這個 token 是 eccal 簽署的，我們需要通過 eccal API 驗證
    let decoded: any;
    try {
      // 先嘗試通過 eccal API 驗證 token
      console.log('通過 eccal API 驗證 token...');
      
      const verifyResponse = await fetch('https://eccal.thinkwithblack.com/api/sso/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://audai.thinkwithblack.com'
        },
        body: JSON.stringify({ token })
      });

      const verifyData = await verifyResponse.json();
      
      if (!verifyData.success || !verifyData.valid) {
        console.log('eccal API 驗證失敗:', verifyData);
        throw new Error('Token verification failed via eccal API');
      }

      const user = verifyData.user;
      console.log('eccal API 驗證成功:', user);
      
      // 轉換為我們的用戶格式
      const userPayload: JWTUser = {
        id: user.id,
        email: user.email,
        name: user.name || 'Unknown User',
        membership: user.membership || 'free',
        credits: user.credits || 0,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days
      };
      
      decoded = userPayload;
      console.log('JWT 驗證成功，用戶:', decoded.email);
    } catch (error) {
      console.log('JWT 驗證失敗:', error.message);
      res.status(401).json({ message: 'Unauthorized - Invalid token' });
      return;
    }
    
    // 檢查 token 是否過期
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      res.status(401).json({ message: 'Unauthorized - Token expired' });
      return;
    }

    // 確保用戶在本地資料庫中存在
    await ensureUserExists(decoded);
    
    // 將用戶資訊附加到 request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT 認證錯誤:', error);
    res.status(401).json({ message: 'Unauthorized - Invalid token' });
  }
};

// 驗證 token 的輔助函數
export const verifyToken = (token: string): JWTUser | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as JWTUser;
    
    // 檢查 token 是否過期
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Token 驗證失敗:', error);
    return null;
  }
};

// 從 token 中提取用戶 ID
export const getUserIdFromToken = (token: string): string | null => {
  const user = verifyToken(token);
  return user?.id || null;
};

// 檢查用戶是否為付費會員
export const isPremiumUser = (user: JWTUser): boolean => {
  return user.membership === 'premium' || user.membership === 'pro';
};

// 檢查用戶點數是否足夠
export const hasEnoughCredits = (user: JWTUser, requiredCredits: number): boolean => {
  return (user.credits || 0) >= requiredCredits;
};