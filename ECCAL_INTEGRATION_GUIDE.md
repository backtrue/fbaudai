# Eccal 子服務整合完整指南

## 概述

本指南記錄了「報受眾」與 eccal.thinkwithblack.com 統一認證系統的完整整合經驗，包含用戶流程、技術實作和常見問題解決方案。

## 整合架構

### 認證流程
1. **用戶點擊 Google 登入** → 重定向到 eccal.thinkwithblack.com
2. **eccal 處理 Google OAuth** → 生成包含會員資訊的 JWT token
3. **重定向回子服務** → 帶有 JWT token 的 callback
4. **子服務驗證 token** → 從 JWT 中解析用戶資訊
5. **建立本地 session** → 儲存用戶狀態和會員資訊

### 技術架構
```
用戶 → 子服務 → eccal 認證中心 → Google OAuth → eccal → 子服務
     ↓                                                    ↓
   前端界面 ←── JWT Token + 會員資訊 ←── 本地驗證 ←── JWT 解析
```

## 前端實作

### 1. 基本設定

**eccalAuth.ts**
```typescript
export interface EccalUser {
  id: string;
  email: string;
  name: string;
  membership?: string;
  credits?: number;
}

export class EccalAuth {
  private config: EccalAuthConfig;
  private tokenKey = 'eccal-auth-token';
  
  constructor(config: EccalAuthConfig) {
    this.config = config;
  }
  
  login(): void {
    // 重定向到 eccal 進行 Google OAuth
    const params = new URLSearchParams({
      service: 'audai',
      origin: window.location.origin
    });
    window.location.href = `${this.config.baseUrl}/api/sso/login?${params}`;
  }
  
  logout(): void {
    this.clearAuth();
    window.location.href = `${this.config.baseUrl}/api/sso/logout`;
  }
}
```

### 2. JWT Token 處理

**關鍵問題：Cookie 名稱一致性**
```typescript
// ❌ 錯誤：Cookie 名稱不一致
// 設定時：'auth-token'  
// 清除時：'auth_token'

// ✅ 正確：統一 Cookie 名稱
setToken(token: string): void {
  document.cookie = `audai-jwt-token=${token}; path=/; secure; samesite=strict`;
}

clearAuth(): void {
  document.cookie = `audai-jwt-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
```

### 3. 認證狀態管理

**useAuth.ts**
```typescript
export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 分鐘
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error
  };
}
```

## 後端實作

### 1. JWT 認證中間件

**關鍵問題：JWT 欄位解析**
```typescript
// ❌ 錯誤：使用固定預設值
const userPayload: JWTUser = {
  id: decoded.sub,
  email: decoded.email,
  name: decoded.name,
  membership: 'Free',  // 硬編碼預設值
  credits: 30,         // 硬編碼預設值
};

// ✅ 正確：從 JWT 中解析實際值
const userPayload: JWTUser = {
  id: decoded.sub,
  email: decoded.email,
  name: decoded.name,
  membership: decoded.membership || 'free',  // 從 JWT 解析
  credits: decoded.credits || 0,             // 從 JWT 解析
  iat: decoded.iat,
  exp: decoded.exp
};
```

### 2. Cookie 解析

**關鍵問題：多種 Cookie 名稱支援**
```typescript
// ✅ 正確：支援多種可能的 Cookie 名稱
let token = req.headers.authorization?.replace('Bearer ', '');

if (!token) {
  token = req.cookies?.['audai-jwt-token'] || 
          req.cookies?.['auth-token'] || 
          req.cookies?.['auth_token'];
}
```

### 3. 會員資訊獲取

**eccalAuthService.ts**
```typescript
async getMembershipInfo(userId: string): Promise<{ membership: string; credits: number } | null> {
  try {
    const response = await fetch(`${this.baseUrl}/api/account-center/user/${userId}`, {
      headers: {
        'Origin': 'https://audai.thinkwithblack.com', // 重要：CORS 設定
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
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
```

### 4. 點數扣除整合

```typescript
// 產品分析前檢查點數
const currentMembershipInfo = await eccalAuthService.getMembershipInfo(userId);
if (!currentMembershipInfo || currentMembershipInfo.credits < 1) {
  return res.status(400).json({
    message: '點數不足，無法進行分析。',
    currentCredits: currentMembershipInfo?.credits || 0
  });
}

// 執行分析後扣除點數
const deductResult = await eccalAuthService.deductCredits(userId, 1, '產品圖片分析');
if (!deductResult.success) {
  return res.status(500).json({ message: '點數扣除失敗' });
}
```

## 常見問題與解決方案

### 1. 認證狀態抓不到問題

**問題描述**
- Google 登入後重定向回子服務
- 前端 `useAuth` 顯示 `isAuthenticated: false`
- 後端能正確解析 JWT token

**根本原因**
1. Cookie 名稱不一致
2. JWT 解析邏輯錯誤
3. 前端狀態更新延遲

**解決方案**
```typescript
// 1. 統一 Cookie 名稱
const COOKIE_NAME = 'audai-jwt-token';

// 2. 前端 callback 處理
handleCallback(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token) {
    this.setToken(token);
    // 重要：立即觸發認證狀態更新
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    window.location.href = '/'; // 清除 URL 參數
  }
}

// 3. 後端確保 JWT 正確解析
if (decoded.membership) {
  userPayload.membership = decoded.membership;
}
if (decoded.credits !== undefined) {
  userPayload.credits = decoded.credits;
}
```

### 2. CORS 設定問題

**問題描述**
- 子服務呼叫 eccal API 時出現 CORS 錯誤

**解決方案**
```typescript
// 所有對 eccal 的請求都需要 Origin header
const response = await fetch(`${this.baseUrl}/api/account-center/user/${userId}`, {
  headers: {
    'Origin': 'https://audai.thinkwithblack.com',
    'Content-Type': 'application/json'
  },
});
```

### 3. 會員資訊不同步問題

**問題描述**
- 前端顯示的會員等級和點數不正確
- 資料庫中的用戶資訊過時

**解決方案**
```typescript
// 每次獲取用戶資訊時都從 eccal 即時查詢
app.get('/api/auth/user', jwtAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  let user = await storage.getUser(userId);
  
  // 從 eccal 獲取最新會員資訊
  const membershipInfo = await eccalAuthService.getMembershipInfo(userId);
  
  res.json({
    ...user,
    membership: membershipInfo?.membership || 'free',
    credits: membershipInfo?.credits || 0
  });
});
```

## 用戶流程

### 完整登入流程
1. 用戶點擊「Google 登入」
2. 重定向到 `eccal.thinkwithblack.com/api/sso/login?service=audai`
3. eccal 處理 Google OAuth 認證
4. 認證成功後，eccal 生成包含會員資訊的 JWT token
5. 重定向回子服務 `/auth/callback?token=<jwt_token>`
6. 子服務前端接收 token，存入 Cookie
7. 觸發認證狀態更新
8. 前端顯示已登入狀態和會員資訊

### 登出流程
1. 用戶點擊「登出」
2. 清除本地 Cookie
3. 重定向到 eccal 登出端點
4. eccal 清除 session
5. 重定向回子服務首頁

## 除錯技巧

### 1. JWT Token 檢查
```bash
# 解析 JWT token 內容
node -e "console.log(JSON.stringify(require('jsonwebtoken').decode('YOUR_TOKEN'), null, 2))"
```

### 2. Cookie 狀態檢查
```typescript
// 前端 Console 檢查
console.log('Cookies:', document.cookie);

// 後端檢查
console.log('可用的 cookies:', req.cookies);
```

### 3. API 端點測試
```bash
# 測試 eccal 用戶資料
curl -H "Origin: https://audai.thinkwithblack.com" \
     "https://eccal.thinkwithblack.com/api/account-center/user/USER_ID"
```

## 最佳實踐

### 1. 錯誤處理
```typescript
// 統一的錯誤處理
export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

// 在組件中使用
const mutation = useMutation({
  onError: (error) => {
    if (isUnauthorizedError(error)) {
      toast({
        title: "未授權",
        description: "您已登出，正在重新登入...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/auth/login";
      }, 500);
    }
  },
});
```

### 2. 安全考量
- 使用 HTTP-only cookies 儲存 JWT token
- 設定適當的 Cookie 過期時間
- 實作 token 刷新機制
- 驗證 JWT 簽名（如果需要）

### 3. 性能優化
- 快取會員資訊（適當的 staleTime）
- 避免重複 API 呼叫
- 使用 React Query 的自動重試機制

## 測試檢查清單

### 登入測試
- [ ] Google 登入重定向正確
- [ ] JWT token 正確設定到 Cookie
- [ ] 前端認證狀態正確更新
- [ ] 會員等級和點數正確顯示

### 登出測試
- [ ] Cookie 正確清除
- [ ] 前端狀態正確重置
- [ ] 重定向到登入頁面

### 會員功能測試
- [ ] 點數扣除正確執行
- [ ] 會員等級限制正確應用
- [ ] 會員資訊即時更新

## 結論

成功整合 eccal 統一認證系統的關鍵在於：
1. **一致的 Cookie 命名** - 避免設定和清除不一致
2. **正確的 JWT 解析** - 確保會員資訊正確提取
3. **適當的錯誤處理** - 優雅處理認證失敗情況
4. **即時的狀態同步** - 確保前後端狀態一致

遵循本指南可以避免常見的整合問題，實現穩定可靠的統一認證系統。