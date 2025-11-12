import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, TrendingUp, Zap, CheckCircle, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { EccalStatusIndicator } from "@/components/EccalStatusIndicator";
import { SEOHead } from "@/components/SEOHead";
import { getPageSEO } from "@/lib/seo";

// 定義 EccalAuth 接口
declare global {
  interface Window {
    EccalAuth: any;
  }
}

export default function LandingNew() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 載入 eccal SDK，如果失敗則直接顯示登入頁面
    const script = document.createElement('script');
    script.src = 'https://eccal.thinkwithblack.com/eccal-auth-sdk.js';
    script.onload = () => {
      initializeAuth();
    };
    script.onerror = () => {
      console.log('eccal SDK 載入失敗，使用預設模式');
      setIsLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const initializeAuth = () => {
    if (window.EccalAuth) {
      try {
        const auth = new window.EccalAuth({
          baseUrl: 'https://eccal.thinkwithblack.com',
          siteName: 'AudAI',
          onLogin: (userData: any) => {
            console.log('用戶登入成功:', userData);
            setUser(userData);
            setIsAuthenticated(true);
            setIsLoading(false);
          },
          onLogout: () => {
            console.log('用戶登出');
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
          },
          onError: (error: any) => {
            console.error('認證錯誤:', error);
            setIsLoading(false);
          }
        });

        // 檢查認證狀態
        auth.checkAuth().then((userData: any) => {
          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
          }
          setIsLoading(false);
        }).catch((error: any) => {
          console.error('認證檢查失敗:', error);
          setIsLoading(false);
        });

        // 將 auth 實例存儲到全局
        (window as any).audaiAuth = auth;
      } catch (error) {
        console.error('初始化 eccal SDK 失敗:', error);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    if ((window as any).audaiAuth) {
      (window as any).audaiAuth.login();
    } else {
      // 如果 eccal SDK 不可用，跳轉到 Google OAuth
      window.location.href = '/api/auth/google';
    }
  };

  const handleLogout = () => {
    if ((window as any).audaiAuth) {
      (window as any).audaiAuth.logout();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="max-w-6xl mx-auto">
          {/* 用戶資訊區域 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img 
                  src={user.picture || 'https://via.placeholder.com/60'} 
                  alt="用戶頭像" 
                  className="w-16 h-16 rounded-full border-4 border-blue-500"
                />
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">歡迎回來，{user.name}</h2>
                  <p className="text-gray-600">{user.email}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {user.membership || 'Free'}
                    </span>
                    <span className="text-green-600 font-medium">
                      {user.credits || 0} 點數
                    </span>
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleLogout}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                登出
              </Button>
            </div>
          </div>

          {/* 主要功能區域 */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              AI 廣告受眾分析平台
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              使用 AI 技術分析您的產品圖片，生成精準的廣告受眾建議
            </p>
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3"
              onClick={() => window.location.href = '/dashboard'}
            >
              開始分析
            </Button>
          </div>

          {/* 功能介紹 */}
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Zap className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                <CardTitle>AI 圖片分析</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  使用先進的 AI 技術分析產品圖片，識別關鍵特徵和目標受眾
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Target className="w-12 h-12 mx-auto text-purple-600 mb-4" />
                <CardTitle>精準受眾定位</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  基於 Facebook API 真實數據，提供準確的廣告受眾建議
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <TrendingUp className="w-12 h-12 mx-auto text-green-600 mb-4" />
                <CardTitle>提升轉換率</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  幫助您找到最佳的廣告受眾，提升廣告效果和轉換率
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SEOHead {...getPageSEO('landing')} />
      
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl font-bold text-blue-600">報受眾</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={handleLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                開始使用
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="mb-6">
              <span className="text-3xl md:text-4xl font-bold text-blue-600">報受眾</span>
              <span className="text-lg md:text-xl text-gray-500 ml-4">報數據服務</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-8">
              上傳一張圖，讓 AI 幫你找到會買單的客人
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              「報受眾」結合小黑老師的實戰經驗與 GPT-4o 技術，幫你的產品自動生成最精準的 Facebook 廣告受眾建議
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                onClick={handleLogin}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold"
              >
                免費開始分析
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-16">
              ✅ 新用戶註冊即享免費分析額度
            </p>
          </div>
        </div>
      </div>

      {/* Pain Points Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
              你的廣告，是否也遇到這些問題？
            </h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
              <div className="flex items-center bg-white p-6 rounded-lg shadow-sm">
                <div className="text-red-500 mr-4 text-xl">✗</div>
                <p className="text-gray-700">廣告花費越來越高，訂單卻不見起色？</p>
              </div>
              <div className="flex items-center bg-white p-6 rounded-lg shadow-sm">
                <div className="text-red-500 mr-4 text-xl">✗</div>
                <p className="text-gray-700">到底該選哪些興趣標籤？只能憑感覺猜？</p>
              </div>
              <div className="flex items-center bg-white p-6 rounded-lg shadow-sm">
                <div className="text-red-500 mr-4 text-xl">✗</div>
                <p className="text-gray-700">受眾越縮越窄，廣告成效一下就疲乏？</p>
              </div>
              <div className="flex items-center bg-white p-6 rounded-lg shadow-sm">
                <div className="text-red-500 mr-4 text-xl">✗</div>
                <p className="text-gray-700">找了投手，但他真的懂我的產品嗎？</p>
              </div>
            </div>
            <p className="text-xl text-gray-600 mb-6">
              如果以上任何一點說中了你的心聲，那麼...
            </p>
            <h3 className="text-2xl md:text-3xl font-bold text-blue-600 mb-4">
              「報受眾」就是你的解答
            </h3>
            <p className="text-lg text-gray-700 max-w-4xl mx-auto leading-relaxed">
              我們將 15 年的電商廣告投放邏輯，濃縮進 AI 裡。你只需要上傳產品圖片，就能獲得由專家經驗驗證過的真實 Facebook 受眾建議，有效提升廣告 ROI。
            </p>
          </div>
        </div>
      </div>

      {/* Trust & Authority Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              為什麼該相信「報受眾」？
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              因為我們不只給 AI，更給你驗證過的「專家經驗」
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-2xl">黑</span>
                </div>
                <CardTitle className="text-xl">15 年實戰專家監修</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  每一項 AI 分析的背後，都基於小黑老師服務數百個電商品牌、花費上億廣告費所驗證的有效策略
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Target className="w-20 h-20 mx-auto text-purple-600 mb-4" />
                <CardTitle className="text-xl">直連 Facebook Graph API</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  拒絕憑空想像！所有受眾建議都透過 Facebook 官方 API 進行即時驗證，確保興趣標籤真實有效、預估規模有所本
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Zap className="w-20 h-20 mx-auto text-green-600 mb-4" />
                <CardTitle className="text-xl">頂尖 AI 模型驅動</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  採用 OpenAI 最新的 GPT-4o 視覺分析技術，能精準理解您的產品價值、目標客群與市場定位
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">1000+</div>
              <div className="text-gray-600">成功分析</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">95%</div>
              <div className="text-gray-600">準確率</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">50%+</div>
              <div className="text-gray-600">轉換率提升</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-600 mb-2">24/7</div>
              <div className="text-gray-600">服務可用</div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              只需三步驟，三分鐘獲得專家級受眾建議
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <span className="text-3xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">上傳圖片</h3>
              <p className="text-gray-600 leading-relaxed">
                拖曳或點擊上傳你的產品圖片
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                <span className="text-3xl font-bold text-purple-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">AI 分析</h3>
              <p className="text-gray-600 leading-relaxed">
                AI 自動識別產品類別、分析目標客群與關鍵字
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <span className="text-3xl font-bold text-green-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">獲得建議</h3>
              <p className="text-gray-600 leading-relaxed">
                獲得可直接複製使用的 Facebook 精準受眾包
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            準備好讓每一分廣告預算都花在刀口上嗎？
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            停止無效的廣告測試，讓專家經驗與 AI 為你開路
          </p>
          
          <Button 
            onClick={handleLogin}
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
          >
            立即免費體驗
          </Button>
          
          <div className="mt-8 text-white/80 text-sm">
            <p>整合 eccal 會員系統，安全登入，即刻使用</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* 主要內容區域 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* 公司介紹 (佔2列) */}
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-xl font-bold mb-4">
                <a href="https://thinkwithblack.com/" target="_blank" rel="noopener noreferrer">
                  報數據｜專業電商廣告分析平台
                </a>
              </h3>
              <p className="text-gray-300 mb-4">
                讓廣告操作者，擁有看懂數據與主導策略的能力。我們整合實戰經驗，從 GA 數據到 Facebook 廣告指標，幫助你看懂每個成效背後的意義。
              </p>
              <p className="text-gray-300 mb-4 text-sm">
                廣告與服務合作請寄信至：
                <a href="mailto:backtrue@thinkwithblack.com" className="text-blue-300 hover:text-blue-200">
                  backtrue@thinkwithblack.com
                </a>
              </p>
            </div>
            
            {/* 課程連結 */}
            <div>
              <h4 className="text-lg font-semibold mb-4">我們的課程</h4>
              <ul className="space-y-2">
                <li>
                  <a href="https://www.pressplay.cc/link/s/88C22BDC" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
                    電商教學
                  </a>
                </li>
                <li>
                  <a href="https://www.pressplay.cc/link/s/5355C492" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
                    FB廣告初階教學
                  </a>
                </li>
                <li>
                  <a href="https://www.pressplay.cc/link/s/CAD627D3" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
                    FB廣告進階教學
                  </a>
                </li>
              </ul>
            </div>
            
            {/* 服務內容 */}
            <div>
              <h4 className="text-lg font-semibold mb-4">服務內容</h4>
              <ul className="space-y-2">
                <li>
                  <a href="https://blog.thinkwithblack.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
                    部落格
                  </a>
                </li>
                <li>
                  <a href="https://thinkwithblack.com/privacy" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
                    隱私政策
                  </a>
                </li>
                <li>
                  <a href="https://thinkwithblack.com/terms" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
                    服務條款
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          {/* 底部區域 */}
          <div className="border-t border-gray-700 mt-8 pt-8">
            <div className="flex flex-col items-center space-y-4">
              {/* 四個主要服務連結 */}
              <div className="flex justify-center items-center gap-2 text-blue-300">
                <a href="https://eccal.thinkwithblack.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-200 font-medium">
                  報數據
                </a>
                <span className="text-gray-400">｜</span>
                <a href="https://audai.thinkwithblack.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-200 font-medium">
                  報受眾
                </a>
                <span className="text-gray-400">｜</span>
                <a href="https://quote.thinkwithblack.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-200 font-medium">
                  報價
                </a>
                <span className="text-gray-400">｜</span>
                <a href="https://thinkwithblack.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-200 font-medium">
                  報 LINE
                </a>
              </div>
              
              {/* 友情連結 */}
              <div className="flex flex-col items-center gap-1 text-gray-400 text-sm">
                <span className="font-medium">友情連結</span>
                <div className="flex justify-center items-center gap-2">
                  <a href="https://www.bvgcorp.net" target="_blank" rel="noopener noreferrer nofollow" className="hover:text-gray-300 transition-colors">
                    BVG全方位電商顧問
                  </a>
                  <span>｜</span>
                  <a href="https://www.ecpaydata.com.tw/" target="_blank" rel="noopener noreferrer nofollow" className="hover:text-gray-300 transition-colors">
                    數據投廣專家綠界大數據
                  </a>
                </div>
              </div>
              
              {/* 版權聲明 */}
              <p className="text-gray-400 text-sm">
                © 2025 煜言顧問有限公司(TW) <a href="https://toldyou.co" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">燈言顧問株式会社(JP)</a> 版權所有
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}