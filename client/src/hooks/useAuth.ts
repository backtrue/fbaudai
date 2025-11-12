import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function useAuth() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // 輔助函數：讀取 cookie 值
  function getCookieValue(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  useEffect(() => {
    // 初始化認證
    async function initAuth() {
      console.log('🔄 初始化認證系統...');
      console.log('當前頁面 URL:', window.location.href);
      console.log('當前 origin:', window.location.origin);
      
      // 檢查 URL 參數以處理 OAuth 回調
      const urlParams = new URLSearchParams(window.location.search);
      
      // 檢查是否有 Google OAuth 回調參數
      const hasGoogleCode = urlParams.get('code');
      const hasState = urlParams.get('state');
      
      // 根據 eccal 文件，檢查 auth_success 參數和 token 參數
      if (urlParams.get('auth_success') === 'true') {
        console.log('✅ 檢測到 eccal OAuth 認證成功回調');
        
        const token = urlParams.get('token');
        console.log('Token from URL:', token ? '已找到' : '未找到');
        
        if (token) {
          console.log('✅ 找到 JWT token，儲存到 localStorage...');
          // 使用與 eccalAuth.ts 相同的 key
          localStorage.setItem('eccal_token', token);
          
          // 清除 URL 參數
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // 立即重新檢查認證狀態
          setTimeout(() => {
            window.location.reload();
          }, 100);
        } else {
          console.log('❌ 未找到 JWT token 參數');
        }
      } else if (urlParams.get('auth_error') === 'true') {
        const errorMsg = urlParams.get('error') || '登入失敗';
        console.error('❌ OAuth 認證失敗:', errorMsg);
        // 清除 URL 參數
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // 檢查後端認證狀態（使用 Authorization header）
      try {
        const apiUrl = window.location.origin + '/api/auth/user';
        console.log('正在請求 API:', apiUrl);
        
        // 使用與 eccalAuth.ts 相同的 key
        const token = localStorage.getItem('eccal_token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          console.log('✅ 找到 localStorage token，添加到 Authorization header');
        } else {
          console.log('❌ 未找到 localStorage token');
        }
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers,
          credentials: 'include', // 確保包含 cookies
        });
        
        console.log('認證回應狀態:', response.status);

        if (response.ok) {
          const userData = await response.json();
          console.log('✅ 用戶認證成功:', userData);
          setUser(userData);
        } else {
          console.log('❌ 用戶未認證');
          setUser(null);
        }
      } catch (error) {
        console.error('認證檢查失敗:', error);
        setUser(null);
      }
      
      setIsInitialized(true);
    }
    
    initAuth();
  }, []);

  // 使用 eccalAuth 進行認證，不需要 React Query
  const isLoading = !isInitialized;

  const logout = async () => {
    console.log('🔄 開始登出流程...');
    
    // 清除 localStorage token（使用與 eccalAuth.ts 相同的 key）
    localStorage.removeItem('eccal_token');
    console.log('✅ 已清除 localStorage token');
    
    try {
      // 調用後端的登出端點來清除 HttpOnly cookie
      const logoutUrl = window.location.origin + '/api/auth/logout';
      await fetch(logoutUrl, {
        method: 'POST',
        credentials: 'include',
      });
      console.log('✅ 已清除服務端 cookie');
    } catch (error) {
      console.log('⚠️ 登出請求失敗:', error);
    }
    
    setUser(null);
    
    // 清除 React Query 緩存
    queryClient.clear();
    console.log('✅ 已清除 React Query 緩存');
    
    // 重定向到主頁
    console.log('🔄 重定向到主頁...');
    window.location.href = '/';
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
  };
}
