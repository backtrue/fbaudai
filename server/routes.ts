import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { jwtAuth, type AuthenticatedRequest, ensureUserExists, isPremiumUser } from "./jwtAuth";
import { eccalAuthService } from "./eccalAuthService";

import { googleAuthService } from "./googleAuth";
import { analyzeProductImage, analyzeCreativeDiversity, generateAudienceKeywords } from "./services/aiAnalysisService";
import { verifyAndGenerateAudiences } from "./services/metaGraphService";
import { insertAnalysisSchema, users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import multer from "multer";
import sharp from "sharp";
import cookieParser from "cookie-parser";
import cors from "cors";
import * as jwt from "jsonwebtoken";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // 簡化的 CORS 設定，避免函數回調問題
  app.use(cors({
    origin: true, // 允許所有來源
    credentials: true
  }));

  // Cookie parser is already configured in index.ts
  // Favicon 處理 - 設定快取並提供實際內容
  app.get('/favicon.ico', (req, res) => {
    res.set({
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'public, max-age=31536000', // 1 年快取
      'Expires': new Date(Date.now() + 31536000000).toUTCString()
    });
    // 提供一個簡單的 16x16 ICO 文件（Base64 編碼）
    const icoData = Buffer.from('AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABILAAASCwAAAAAAAAAAAAD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A', 'base64');
    res.send(icoData);
  });

  // SVG favicon 處理
  app.get('/favicon.svg', (req, res) => {
    res.set({
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000', // 1 年快取
      'Expires': new Date(Date.now() + 31536000000).toUTCString()
    });
    // 提供 SVG favicon 內容
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <rect width="64" height="64" rx="12" fill="#2563eb"/>
      <path d="M16 20h32v8H16zM16 32h32v8H16zM16 44h24v8H16z" fill="white"/>
      <circle cx="46" cy="48" r="6" fill="#fbbf24"/>
      <text x="32" y="54" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="white">報受眾</text>
    </svg>`;
    res.send(svgContent);
  });





  // Google OAuth 認證路由 - 重定向到 eccal 統一認證
  const handleGoogleAuth = (req: any, res: any) => {
    console.log('Redirecting to eccal unified authentication...');
    
    // 獲取當前請求的域名，確保使用 HTTPS
    let origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    
    // 如果是 audai.thinkwithblack.com，強制使用 HTTPS
    if (origin.includes('audai.thinkwithblack.com')) {
      origin = 'https://audai.thinkwithblack.com';
    }
    
    const returnTo = `${origin}/`;
    
    console.log('Request origin:', origin);
    console.log('Return to:', returnTo);
    
    // 建構 eccal SSO 登入 URL（使用正確的端點）
    const eccalSSOUrl = new URL('https://eccal.thinkwithblack.com/api/auth/google-sso');
    eccalSSOUrl.searchParams.append('service', 'audai');
    eccalSSOUrl.searchParams.append('returnTo', returnTo);
    
    console.log('Eccal SSO URL:', eccalSSOUrl.toString());
    res.redirect(eccalSSOUrl.toString());
  };

  // 添加兩個路由以支援不同的端點
  app.get('/api/auth/google', handleGoogleAuth);
  app.get('/api/auth/google-sso', handleGoogleAuth);

  // 認證狀態檢查端點 - 檢查是否有 JWT cookie
  app.get('/api/auth/check', (req, res) => {
    console.log('=== 認證狀態檢查 ===');
    console.log('可用的 cookies:', req.cookies);
    console.log('Authorization header:', req.headers.authorization);
    
    const possibleCookieNames = ['auth_token', 'audai-jwt-token', 'auth-token', 'jwt-token', 'token'];
    console.log('檢查可能的 cookie 名稱:');
    possibleCookieNames.forEach(name => {
      console.log(`  ${name}: ${req.cookies?.[name] ? 'found' : 'not found'}`);
    });

    // 回應詳細資訊
    res.json({
      cookies: req.cookies,
      authHeader: req.headers.authorization,
      possibleTokens: possibleCookieNames.reduce((acc, name) => {
        acc[name] = req.cookies?.[name] ? 'found' : 'not found';
        return acc;
      }, {} as Record<string, string>)
    });
  });

  // eccal JWT token 驗證端點
  app.post('/api/auth/verify-eccal-token', async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    try {
      // 調用 eccal 的 token 驗證 API
      const response = await fetch('https://eccal.thinkwithblack.com/api/sso/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': req.headers.origin || 'https://audai.thinkwithblack.com'
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();
      
      if (data.success && data.valid) {
        // 確保用戶存在於本地資料庫
        const user = data.user;
        await ensureUserExists({
          id: user.id,
          email: user.email,
          name: user.name,
          membership: user.membership,
          credits: user.credits
        });
        
        res.json({ success: true, user: data.user });
      } else {
        res.status(401).json({ success: false, error: 'Invalid token' });
      }
    } catch (error) {
      console.error('eccal token verification failed:', error);
      res.status(500).json({ success: false, error: 'Token verification failed' });
    }
  });

  // 登出路由
  app.post('/api/auth/logout', (req, res) => {
    console.log('User logout requested');
    
    // 清除服務端的 JWT cookie (使用完全相同的屬性)
    res.clearCookie('audai-jwt-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    // 也清除可能的舊 cookie 名稱
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    console.log('✅ JWT cookies cleared successfully');
    // 返回成功響應
    res.json({ message: 'Logged out successfully' });
  });

  // Google OAuth 登出路由（保留作為備用）
  app.get('/api/auth/google/logout', (req, res) => {
    console.log('User logout requested via GET');
    
    // 清除服務端的 JWT cookie
    res.clearCookie('audai-jwt-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    // 重定向到主頁
    res.redirect('/');
  });

  // SSO 回調路由 - 接收來自 eccal 的 JWT token
  app.get('/api/auth/callback', async (req, res) => {
    try {
      console.log('SSO callback received from eccal:', req.query);
      
      const { token, error, auth_success } = req.query;
      
      if (error) {
        console.log('SSO authentication failed:', error);
        return res.redirect(`/?auth_error=true&error=${encodeURIComponent(error as string)}`);
      }
      
      if (!token || typeof token !== 'string') {
        console.log('JWT token missing from callback');
        return res.redirect('/?auth_error=true&error=missing_token');
      }

      console.log('Received JWT token from eccal');
      console.log('Token preview:', token.substring(0, 20) + '...');
      
      // 設置 JWT token 到 cookie（使用 auth_token 作為 cookie 名稱）
      res.cookie('auth_token', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 天
      });
      
      console.log('✅ JWT token set in cookie and will be passed to frontend');
      // 重定向時將 token 作為 query parameter 傳遞給前端
      // 前端的 eccalAuth.handleCallback() 會從 URL 中讀取並存入 localStorage
      return res.redirect(`/?token=${encodeURIComponent(token)}&auth_success=true`);
      
    } catch (error) {
      console.error('SSO callback error:', error);
      res.redirect('/?auth_error=true&error=callback_failed');
    }
  });



  // eccal API 狀態檢查端點
  app.get('/api/eccal-status', async (req, res) => {
    try {
      // 檢查 eccal 健康狀態
      const healthResponse = await fetch('https://eccal.thinkwithblack.com/api/health');
      const healthData = await healthResponse.text();
      
      // 測試認證端點
      const testResponse = await fetch('https://eccal.thinkwithblack.com/api/auth/google-sso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://audai.thinkwithblack.com'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          service: 'audai'
        })
      });
      
      const testData = await testResponse.text();
      let parsedTestData;
      
      try {
        parsedTestData = JSON.parse(testData);
      } catch (e) {
        parsedTestData = { error: 'Invalid JSON response', rawResponse: testData.substring(0, 200) };
      }
      
      const isWorking = testResponse.ok && parsedTestData.success;
      const currentError = parsedTestData.error || 'Unknown error';
      
      res.json({
        timestamp: new Date().toISOString(),
        health: {
          status: healthResponse.status,
          data: healthData
        },
        authEndpoint: {
          status: testResponse.status,
          isWorking,
          currentError,
          response: parsedTestData
        },
        summary: isWorking ? 'eccal API 正常運作' : `eccal API 故障: ${currentError}`
      });
    } catch (error) {
      res.status(500).json({
        timestamp: new Date().toISOString(),
        error: 'Failed to check eccal API status',
        details: error.message
      });
    }
  });

  // Test token endpoint
  app.get("/api/test-token", async (req, res) => {
    const token = process.env.META_ACCESS_TOKEN;
    res.json({
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenStart: token?.substring(0, 20) || 'none'
    });
  });

  // Test endpoint for checking Meta API status
  app.get('/api/meta-status', async (req, res) => {
    try {
      const { facebookTokenManager } = await import('./services/facebookTokenManager');
      const tokenStatus = facebookTokenManager.getTokenStatus();
      const isWorking = await facebookTokenManager.testToken();
      
      res.json({
        tokenStatus,
        isWorking,
        message: isWorking ? 'Facebook API is working' : 'Facebook API is not responding',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to check Meta API status',
        message: error.message
      });
    }
  });

  // 測試用的模擬 eccal JWT token 端點
  app.post('/api/test-eccal-jwt', async (req, res) => {
    try {
      const { email, name } = req.body;
      
      // 模擬 eccal 的 JWT token 格式 (此 token 只用於測試)
      const mockUser = {
        id: '1234567890',
        email: email || 'test@example.com',
        name: name || 'Test User',
        membership: 'pro',
        credits: 100
      };
      
      // 生成簡單的測試 token (只用於本地測試)
      const testToken = Buffer.from(JSON.stringify(mockUser)).toString('base64');
      
      // 設置到 cookie
      res.cookie('auth_token', testToken, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 天
      });
      
      res.json({
        success: true,
        message: 'Test token set successfully',
        user: mockUser
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to set test token',
        message: error.message
      });
    }
  });

  // Google OAuth 診斷端點
  app.get('/api/oauth-debug', (req, res) => {
    res.json({
      clientId: process.env.GOOGLE_CLIENT_ID,
      redirectUri: 'https://audai.thinkwithblack.com/api/auth/google/callback',
      authUrl: googleAuthService.generateAuthUrl(),
      timestamp: new Date().toISOString()
    });
  });

  // 用戶查詢調試端點
  app.get('/api/debug/user-lookup', jwtAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const email = req.user!.email;
      
      console.log('調試用戶查找:', { userId, email });
      
      // 檢查是否存在該 ID 的用戶
      const userById = await storage.getUser(userId);
      console.log('按 ID 查找用戶:', userById);
      
      // 檢查是否存在該 email 的用戶
      const userByEmail = await db.select().from(users).where(eq(users.email, email));
      console.log('按 email 查找用戶:', userByEmail);
      
      res.json({
        userId,
        email,
        userById,
        userByEmail,
        userExists: !!userById,
        emailExists: userByEmail.length > 0
      });
    } catch (error) {
      console.error('用戶查找調試錯誤:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // JWT 認證路由 - 符合 eccal SSO 標準
  app.post('/api/auth/verify-token', async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ success: false, message: 'Token is required' });
      }

      console.log('🔄 驗證 eccal JWT token...');
      const user = await eccalAuthService.verifyToken(token);
      
      if (!user) {
        console.log('❌ Token 驗證失敗');
        return res.status(401).json({ success: false, valid: false, message: 'Invalid token' });
      }

      // 確保用戶在本地資料庫中存在
      await storage.upsertUser({
        id: user.id,
        email: user.email,
        firstName: user.name.split(' ')[0],
        lastName: user.name.split(' ').slice(1).join(' '),
        profileImageUrl: null
      });

      console.log('✅ Token 驗證成功:', { email: user.email, membership: user.membership });
      
      // 返回符合 eccal SSO 標準的格式
      res.json({
        success: true,
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          membership: user.membership || 'free',
          credits: user.credits || 0
        }
      });
    } catch (error) {
      console.error('❌ Token 驗證錯誤:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // 獲取目前認證用戶
  app.get('/api/auth/user', jwtAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // jwtAuth 中間件已經驗證了用戶並將其附加到 req.user
      const user = req.user!;
      
      // 從本地資料庫獲取完整用戶資訊
      const localUser = await storage.getUser(user.id);
      
      if (!localUser) {
        return res.status(404).json({ message: 'User not found in local database' });
      }
      
      // 返回用戶資料，結合 JWT 中的會員資訊
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        membership: user.membership || 'free',
        credits: user.credits || 0,
        firstName: localUser.firstName,
        lastName: localUser.lastName,
        profileImageUrl: localUser.profileImageUrl
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/auth/user-old', jwtAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const userEmail = req.user!.email;
      
      console.log('嘗試獲取用戶資料 - ID:', userId, 'Email:', userEmail);
      
      // 先檢查是否有相同 email 的用戶（優先使用現有記錄）
      const existingUserByEmail = await db.select().from(users).where(eq(users.email, userEmail));
      
      let user;
      if (existingUserByEmail.length > 0) {
        const existingUser = existingUserByEmail[0];
        console.log('找到相同 email 的現有用戶:', existingUser.id);
        
        // 如果 ID 不同，需要更新 ID 並遷移數據
        if (existingUser.id !== userId) {
          console.log(`需要更新用戶 ID: ${existingUser.id} → ${userId}`);
          user = await storage.upsertUser({
            id: userId,
            email: userEmail,
            firstName: req.user!.name?.split(' ')[0] || existingUser.firstName,
            lastName: req.user!.name?.split(' ').slice(1).join(' ') || existingUser.lastName,
            profileImageUrl: req.user!.profileImageUrl || existingUser.profileImageUrl,
          });
          console.log('✅ 用戶資料已更新並遷移:', user.id);
        } else {
          // ID 相同，直接使用現有記錄
          user = existingUser;
          console.log('✅ 使用現有用戶記錄:', user.id);
        }
      } else {
        // 檢查是否有相同 ID 的用戶
        user = await storage.getUser(userId);
        
        if (!user) {
          // 創建新用戶記錄
          console.log('創建新用戶記錄:', userId);
          user = await storage.upsertUser({
            id: userId,
            email: userEmail,
            firstName: req.user!.name?.split(' ')[0] || 'Unknown',
            lastName: req.user!.name?.split(' ').slice(1).join(' ') || 'User',
            profileImageUrl: req.user!.profileImageUrl,
          });
          console.log('✅ 用戶記錄已創建:', user);
        }
      }

      // 從 Eccal API 獲取最新的會員資訊
      console.log('JWT 用戶資料:', req.user);
      const membershipInfo = await eccalAuthService.getMembershipInfo(userId);
      
      if (membershipInfo) {
        console.log('✅ 成功獲取會員資訊:', membershipInfo);
      } else {
        console.log('⚠️ 無法獲取會員資訊，使用默認值');
      }
      
      res.json({
        ...user,
        membership: membershipInfo?.membership || 'free',
        credits: membershipInfo?.credits || 0
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', jwtAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const stats = await storage.getUserTotalStats(userId);
      
      const currentMonth = new Date().toISOString().slice(0, 7);
      const currentMonthStats = await storage.getUserUsageStats(userId, currentMonth);
      
      res.json({
        totalAnalyses: stats.totalAnalyses,
        totalAudiences: stats.totalAudiences,
        currentMonthAnalyses: currentMonthStats?.analysisCount || 0,
        monthlyLimit: 50, // Configure as needed
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  const parseBoolean = (value: unknown, defaultValue = false): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
      if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    }
    return defaultValue;
  };

  // Multi-image creative diversity analysis (requires authentication)
  app.post(
    '/api/analyze',
    jwtAuth,
    upload.array('images', 10),
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        const files = (req.files as Express.Multer.File[] | undefined) ?? [];
        if (files.length === 0) {
          return res.status(400).json({ message: '至少需要一張圖片' });
        }

        if (files.length > 10) {
          return res.status(400).json({ message: '單次最多上傳 10 張圖片' });
        }

        const isProUser = isPremiumUser(req.user);
        const productNameHint = (req.body?.productNameHint as string | undefined) ?? '';
        const confirmedProductName = (req.body?.confirmedProductName as string | undefined)?.trim();
        const enableFallback = isProUser && parseBoolean(req.body?.enableFallback, false);
        const markConfirmed = parseBoolean(req.body?.isConfirmed, false);
        const priceRange = (req.body?.priceRange as string | undefined) ?? null;
        const salesRegion = (req.body?.salesRegion as string | undefined) ?? null;

        console.log('📥 收到多圖分析請求', {
          userId: req.user.id,
          imageCount: files.length,
          isProUser,
          enableFallback,
        });

        const processedImages = await Promise.all(
          files.map(async (file, index) => {
            console.log(`🔧 處理第 ${index + 1} 張圖片: ${file.originalname}`);
            const buffer = await sharp(file.buffer)
              .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 80 })
              .toBuffer();
            return buffer.toString('base64');
          })
        );

        const creativeResult = await analyzeCreativeDiversity(processedImages, {
          generatePersonas: isProUser,
          generateCreativeBriefs: isProUser,
          runFallbackSummary: enableFallback,
          productNameHint,
        });

        const primaryProduct = creativeResult.productAnalyses[0] ?? {
          productName: '未命名產品',
          productCategory: ['other'],
          targetAudience: ['一般消費者'],
          keywords: ['product'],
          confidence: 0.7,
        };

        const productName = confirmedProductName && confirmedProductName.length > 0
          ? confirmedProductName
          : primaryProduct.productName;

        const analysisRecord = await storage.createAnalysis({
          userId: req.user.id,
          coverImageUrl: `data:image/jpeg;base64,${processedImages[0]}`,
          productName,
          productCategory: creativeResult.productAnalyses.map((item) => item.productCategory).flat(),
          targetAudience: primaryProduct.targetAudience,
          keywords: primaryProduct.keywords,
          confidence: String(primaryProduct.confidence.toFixed(2)),
          priceRange,
          salesRegion,
          clusterSummary: creativeResult.clusters,
          personaInsights: creativeResult.personas,
          creativeBriefs: creativeResult.creativeBriefs,
          finalProductSummary: creativeResult.fallbackSummary?.summary ?? null,
          fallbackConfidence: creativeResult.fallbackSummary
            ? String(creativeResult.fallbackSummary.confidence.toFixed(3))
            : null,
          isConfirmed: markConfirmed,
        });

        const imageRecords = await storage.createAnalysisImages(
          processedImages.map((base64, index) => {
            const vision = creativeResult.visionInsights[index];
            return {
              analysisId: analysisRecord.id,
              imageUrl: `data:image/jpeg;base64,${base64}`,
              position: index,
              googleVisionObjects: vision?.objects ?? [],
              googleVisionLabels: vision?.labels ?? [],
              ocrTexts: vision?.text ?? [],
              dominantColors: vision?.colors ?? [],
            };
          })
        );

        const costMetrics = creativeResult.cost.metrics;
        const costBreakdown = creativeResult.cost.breakdown;

        await storage.upsertAnalysisCost({
          analysisId: analysisRecord.id,
          imageCount: processedImages.length,
          openaiInputTokens: costMetrics.openaiInputTokens,
          openaiOutputTokens: costMetrics.openaiOutputTokens,
          openaiCostUsd: String(costBreakdown.openaiCostUsd.toFixed(4)),
          googleVisionCalls: costMetrics.googleVisionCalls,
          googleVisionCostUsd: String(costBreakdown.googleVisionCostUsd.toFixed(4)),
          metaQueries: costMetrics.metaQueries,
          totalCostUsd: String(costBreakdown.totalCostUsd.toFixed(4)),
          totalCostJpy: String(costBreakdown.totalCostJpy.toFixed(2)),
          estimatedCredits: String(costBreakdown.estimatedCredits.toFixed(2)),
        });

        const currentMonth = new Date().toISOString().slice(0, 7);
        const usageStats = await storage.getUserUsageStats(req.user.id, currentMonth);
        await storage.upsertUsageStats({
          userId: req.user.id,
          month: currentMonth,
          analysisCount: (usageStats?.analysisCount || 0) + 1,
          totalAudiences: usageStats?.totalAudiences || 0,
        });

        res.json({
          analysis: analysisRecord,
          images: imageRecords,
          creativeResult,
        });
      } catch (error) {
        console.error('❌ Error analyzing creative diversity:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('Error details:', {
          message: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : 'Unknown',
        });
        res.status(500).json({ 
          message: 'Failed to analyze images',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  );

  // Generate audience recommendations (temporarily without authentication for testing)
  app.post('/api/generate-audiences', jwtAuth, async (req: AuthenticatedRequest, res) => {
    try {
      
      const { analysisId, productName, productCategory, targetAudience, keywords, priceRange, salesRegion } = req.body;
      
      const aiAnalysis = {
        productName,
        productCategory,
        targetAudience,
        keywords,
        confidence: 0.9,
      };

      // Generate audience keywords
      const audienceKeywords = await generateAudienceKeywords(aiAnalysis, priceRange, salesRegion);
      
      // Verify and generate final recommendations
      const recommendations = await verifyAndGenerateAudiences(aiAnalysis, analysisId);
      
      // Save recommendations to database (only if we have any)
      let savedRecommendations = [];
      if (recommendations.length > 0) {
        savedRecommendations = await storage.createAudienceRecommendations(
          recommendations.map(rec => ({
            analysisId,
            audienceType: rec.audienceType,
            audienceName: rec.audienceName,
            audienceId: rec.audienceId,
            audienceSize: rec.audienceSize,
            usageNote: rec.usageNote,
            isVerified: rec.isVerified,
          }))
        );
      }

      // Update analysis as confirmed
      await storage.updateAnalysis(analysisId, {
        isConfirmed: true,
        priceRange,
        salesRegion,
      });

      // Update usage statistics - 只更新受眾數量，不重複增加分析次數
      const userId = req.user!.id;
      const currentMonth = new Date().toISOString().slice(0, 7);
      const currentStats = await storage.getUserUsageStats(userId, currentMonth);
      
      await storage.upsertUsageStats({
        userId,
        month: currentMonth,
        analysisCount: currentStats?.analysisCount || 0, // 不變更分析次數
        totalAudiences: (currentStats?.totalAudiences || 0) + savedRecommendations.length,
      });

      console.log('✅ 使用統計已更新 - 受眾數量 +', savedRecommendations.length);

      res.json({ recommendations: savedRecommendations });
    } catch (error) {
      console.error("Error generating audiences:", error);
      
      // Check if this is a Facebook API token issue
      if (error.message && error.message.includes('token')) {
        return res.status(400).json({ 
          error: 'Facebook API token expired', 
          message: 'Please update META_ACCESS_TOKEN with a fresh token from Facebook Graph API Explorer.',
          tokenExpired: true 
        });
      }
      
      res.status(500).json({ message: "Failed to generate audience recommendations" });
    }
  });

  // Get analysis history
  app.get('/api/analyses', jwtAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const analyses = await storage.getAnalysisByUserId(userId, limit);
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching analyses:", error);
      res.status(500).json({ message: "Failed to fetch analyses" });
    }
  });

  // Get analysis with recommendations
  app.get('/api/analyses/:id', jwtAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const analysisId = parseInt(req.params.id);
      const analysis = await storage.getAnalysisById(analysisId);
      
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      const recommendations = await storage.getAudienceRecommendationsByAnalysisId(analysisId);
      
      res.json({
        analysis,
        recommendations,
      });
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ message: "Failed to fetch analysis" });
    }
  });

  // 提供測試頁面路由
  app.get('/test-eccal-sdk.html', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>eccal SDK 測試頁面</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
            #app { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
            .status { padding: 15px; margin: 10px 0; border-radius: 8px; font-weight: 500; }
            .status.loading { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
            .status.success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
            .status.error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
            .auth-btn { background: #4285f4; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 500; margin: 10px 5px; }
            .auth-btn:hover { background: #3367d6; }
            .auth-btn.logout { background: #dc3545; }
            .user-info { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; }
            .log-container { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; max-height: 400px; overflow-y: auto; }
            .log-entry { margin: 5px 0; padding: 5px; font-family: monospace; font-size: 14px; }
            .log-entry.info { color: #0066cc; }
            .log-entry.success { color: #28a745; }
            .log-entry.error { color: #dc3545; }
            .log-entry.warning { color: #ffc107; }
        </style>
    </head>
    <body>
        <div id="app">
            <h1>eccal SDK 整合測試頁面</h1>
            
            <div id="loading-status" class="status loading">載入 eccal SDK 中...</div>
            
            <div id="auth-section" style="display: none;">
                <h2>認證狀態</h2>
                <div id="auth-status">未知</div>
                
                <div id="login-area">
                    <button id="login-btn" class="auth-btn">Google 登入</button>
                    <button id="check-auth-btn" class="auth-btn">檢查認證狀態</button>
                </div>
                
                <div id="user-area" style="display: none;">
                    <div id="user-info" class="user-info"></div>
                    <button id="logout-btn" class="auth-btn logout">登出</button>
                    <button id="refresh-btn" class="auth-btn">重新整理</button>
                </div>
            </div>
            
            <div id="api-test-section" style="display: none;">
                <h2>API 測試</h2>
                <button id="test-user-api" class="auth-btn">測試用戶 API</button>
                <button id="test-credits-api" class="auth-btn">測試點數 API</button>
                <button id="test-membership-api" class="auth-btn">測試會員 API</button>
            </div>
            
            <div id="log-section">
                <h2>系統日誌</h2>
                <button onclick="clearLogs()" class="auth-btn">清除日誌</button>
                <div id="log-container" class="log-container"></div>
            </div>
        </div>

        <script>
            function log(message, type = 'info') {
                const logContainer = document.getElementById('log-container');
                const logEntry = document.createElement('div');
                logEntry.className = \`log-entry \${type}\`;
                logEntry.textContent = \`[\${new Date().toLocaleTimeString()}] \${message}\`;
                logContainer.appendChild(logEntry);
                logContainer.scrollTop = logContainer.scrollHeight;
                console.log(\`[\${type.toUpperCase()}] \${message}\`);
            }
            
            function clearLogs() {
                document.getElementById('log-container').innerHTML = '';
            }
            
            function updateStatus(message, type = 'info') {
                const statusDiv = document.getElementById('loading-status');
                statusDiv.textContent = message;
                statusDiv.className = \`status \${type}\`;
            }
            
            function showAuthSection() {
                document.getElementById('auth-section').style.display = 'block';
                document.getElementById('api-test-section').style.display = 'block';
            }
            
            function showUserArea(user) {
                document.getElementById('login-area').style.display = 'none';
                document.getElementById('user-area').style.display = 'block';
                
                const userInfo = document.getElementById('user-info');
                userInfo.innerHTML = \`
                    <h3>用戶資訊</h3>
                    <p><strong>姓名:</strong> \${user.name || '未設定'}</p>
                    <p><strong>Email:</strong> \${user.email || '未設定'}</p>
                    <p><strong>會員等級:</strong> \${user.membership || 'Free'}</p>
                    <p><strong>剩餘點數:</strong> \${user.credits || 0}</p>
                \`;
            }
            
            function showLoginArea() {
                document.getElementById('login-area').style.display = 'block';
                document.getElementById('user-area').style.display = 'none';
            }
            
            function loadEccalSDK() {
                log('開始載入 eccal SDK...', 'info');
                
                fetch('https://eccal.thinkwithblack.com/api/account-center/health')
                    .then(response => response.json())
                    .then(data => {
                        log(\`eccal 健康檢查成功: \${data.status}\`, 'success');
                        
                        const script = document.createElement('script');
                        script.src = 'https://eccal.thinkwithblack.com/eccal-auth-sdk.js';
                        script.onload = () => {
                            log('eccal SDK 載入成功', 'success');
                            initializeAuth();
                        };
                        script.onerror = () => {
                            log('eccal SDK 載入失敗，使用模擬測試', 'warning');
                            createMockSDK();
                            initializeAuth();
                        };
                        document.head.appendChild(script);
                    })
                    .catch(error => {
                        log(\`eccal 健康檢查失敗: \${error.message}\`, 'error');
                        log('使用模擬測試模式', 'warning');
                        createMockSDK();
                        initializeAuth();
                    });
            }
            
            function createMockSDK() {
                log('創建模擬 eccal SDK', 'info');
                
                window.EccalAuth = class {
                    constructor(config) {
                        this.config = config;
                        log(\`初始化 eccal SDK: \${config.siteName}\`, 'info');
                    }
                    
                    async login() {
                        log('模擬 Google 登入流程', 'info');
                        const mockUser = {
                            id: 'mock-user-id',
                            name: '測試用戶',
                            email: 'test@example.com',
                            membership: 'Free',
                            credits: 30
                        };
                        
                        setTimeout(() => {
                            log('模擬登入成功', 'success');
                            this.config.onLogin(mockUser);
                        }, 1000);
                    }
                    
                    async logout() {
                        log('模擬登出', 'info');
                        setTimeout(() => {
                            log('模擬登出成功', 'success');
                            this.config.onLogout();
                        }, 500);
                    }
                    
                    async checkAuth() {
                        log('模擬檢查認證狀態', 'info');
                        return null;
                    }
                    
                    async getToken() {
                        return 'mock-jwt-token';
                    }
                };
            }
            
            function initializeAuth() {
                log('初始化認證系統', 'info');
                
                if (!window.EccalAuth) {
                    log('eccal SDK 不可用', 'error');
                    updateStatus('eccal SDK 載入失敗', 'error');
                    return;
                }
                
                const auth = new window.EccalAuth({
                    baseUrl: 'https://eccal.thinkwithblack.com',
                    siteName: 'AudAI',
                    onLogin: (user) => {
                        log('用戶登入成功', 'success');
                        showUserArea(user);
                        updateStatus('已登入', 'success');
                    },
                    onLogout: () => {
                        log('用戶登出', 'info');
                        showLoginArea();
                        updateStatus('已登出', 'info');
                    },
                    onError: (error) => {
                        log(\`認證錯誤: \${error.message}\`, 'error');
                        updateStatus('認證錯誤', 'error');
                    }
                });
                
                window.audaiAuth = auth;
                
                auth.checkAuth()
                    .then(user => {
                        if (user) {
                            log('發現現有登入狀態', 'success');
                            showUserArea(user);
                            updateStatus('已登入', 'success');
                        } else {
                            log('未登入狀態', 'info');
                            showLoginArea();
                            updateStatus('未登入', 'info');
                        }
                    })
                    .catch(error => {
                        log(\`認證檢查失敗: \${error.message}\`, 'error');
                        showLoginArea();
                        updateStatus('認證檢查失敗', 'error');
                    });
                
                showAuthSection();
            }
            
            async function callEccalAPI(endpoint, options = {}) {
                try {
                    const token = await window.audaiAuth.getToken();
                    const response = await fetch(\`https://eccal.thinkwithblack.com\${endpoint}\`, {
                        ...options,
                        headers: {
                            'Authorization': \`Bearer \${token}\`,
                            'Content-Type': 'application/json',
                            'Origin': window.location.origin,
                            ...options.headers
                        }
                    });
                    
                    const data = await response.json();
                    log(\`API 調用成功: \${endpoint}\`, 'success');
                    return data;
                } catch (error) {
                    log(\`API 調用失敗: \${endpoint} - \${error.message}\`, 'error');
                    throw error;
                }
            }
            
            document.addEventListener('DOMContentLoaded', () => {
                log('頁面載入完成', 'info');
                loadEccalSDK();
                
                document.getElementById('login-btn').addEventListener('click', () => {
                    log('用戶點擊登入按鈕', 'info');
                    window.audaiAuth.login();
                });
                
                document.getElementById('logout-btn').addEventListener('click', () => {
                    log('用戶點擊登出按鈕', 'info');
                    window.audaiAuth.logout();
                });
                
                document.getElementById('check-auth-btn').addEventListener('click', async () => {
                    log('手動檢查認證狀態', 'info');
                    try {
                        const user = await window.audaiAuth.checkAuth(true);
                        if (user) {
                            showUserArea(user);
                            log('認證狀態: 已登入', 'success');
                        } else {
                            showLoginArea();
                            log('認證狀態: 未登入', 'info');
                        }
                    } catch (error) {
                        log(\`認證檢查失敗: \${error.message}\`, 'error');
                    }
                });
                
                document.getElementById('refresh-btn').addEventListener('click', async () => {
                    log('重新整理用戶資料', 'info');
                    try {
                        const user = await window.audaiAuth.checkAuth(true);
                        if (user) {
                            showUserArea(user);
                            log('用戶資料已更新', 'success');
                        }
                    } catch (error) {
                        log(\`重新整理失敗: \${error.message}\`, 'error');
                    }
                });
                
                document.getElementById('test-user-api').addEventListener('click', async () => {
                    log('測試用戶 API', 'info');
                    try {
                        const data = await callEccalAPI('/api/account-center/user');
                        log(\`用戶 API 回應: \${JSON.stringify(data)}\`, 'success');
                    } catch (error) {
                        log(\`用戶 API 測試失敗: \${error.message}\`, 'error');
                    }
                });
                
                document.getElementById('test-credits-api').addEventListener('click', async () => {
                    log('測試點數 API', 'info');
                    try {
                        const data = await callEccalAPI('/api/account-center/credits');
                        log(\`點數 API 回應: \${JSON.stringify(data)}\`, 'success');
                    } catch (error) {
                        log(\`點數 API 測試失敗: \${error.message}\`, 'error');
                    }
                });
                
                document.getElementById('test-membership-api').addEventListener('click', async () => {
                    log('測試會員 API', 'info');
                    try {
                        const data = await callEccalAPI('/api/account-center/membership');
                        log(\`會員 API 回應: \${JSON.stringify(data)}\`, 'success');
                    } catch (error) {
                        log(\`會員 API 測試失敗: \${error.message}\`, 'error');
                    }
                });
            });
        </script>
    </body>
    </html>
    `);
  });

  const httpServer = createServer(app);
  return httpServer;
}
