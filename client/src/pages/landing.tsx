import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Target, 
  Users, 
  TrendingUp, 
  Zap, 
  Shield,
  CheckCircle,
  ArrowRight,
  Upload,
  Brain,
  Facebook
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-200">
            <Brain className="w-4 h-4 mr-1" />
            AI 驅動的廣告受眾分析
          </Badge>
          
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            <span className="text-blue-600">報受眾</span>
            <br />
            精準廣告投放的智能助手
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            上傳產品圖片，AI 自動分析並生成精準的 Facebook 廣告受眾建議。
            基於真實 Facebook API 數據，讓您的廣告投放更精準、更有效。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
              onClick={() => {
                window.location.href = '/api/auth/google';
              }}
            >
              Google 登入開始使用
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3"
            >
              觀看示範
              <Camera className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>

        {/* Key Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">上傳圖片</CardTitle>
              <CardDescription>
                簡單拖拽產品圖片，支援多種格式
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-purple-600" />
              </div>
              <CardTitle className="text-xl">AI 智能分析</CardTitle>
              <CardDescription>
                Google Vision + 多模態深度學習分類
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">精準受眾</CardTitle>
              <CardDescription>
                基於真實 Facebook API 的受眾建議
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Core Benefits */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              為什麼選擇報受眾？
            </h2>
            <p className="text-lg text-gray-600">
              專為電商賣家打造的 AI 廣告受眾分析平台
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Facebook className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">真實 Facebook 數據</h3>
              <p className="text-sm text-gray-600">
                直接對接 Facebook Graph API，確保受眾建議真實有效
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">快速分析</h3>
              <p className="text-sm text-gray-600">
                30秒內完成圖片分析和受眾建議生成
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">提升轉換率</h3>
              <p className="text-sm text-gray-600">
                精準受眾定位，提升廣告投放效果
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">數據安全</h3>
              <p className="text-sm text-gray-600">
                企業級數據加密，保護您的商業機密
              </p>
            </div>
          </div>
        </div>

        {/* Product Categories */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              支援全品類商品分析
            </h2>
            <p className="text-lg text-gray-600">
              涵蓋電商各大類別，智能識別產品特徵
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: "電子產品", icon: "📱" },
              { name: "時尚服飾", icon: "👕" },
              { name: "美妝保養", icon: "💄" },
              { name: "食品飲料", icon: "🍔" },
              { name: "健康保健", icon: "💊" },
              { name: "家居用品", icon: "🏠" },
              { name: "運動用品", icon: "⚽" },
              { name: "汽車用品", icon: "🚗" },
              { name: "書籍教育", icon: "📚" },
              { name: "玩具遊戲", icon: "🎮" },
              { name: "珠寶飾品", icon: "💎" },
              { name: "其他商品", icon: "🛍️" }
            ].map((category, index) => (
              <div key={index} className="text-center p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
                <div className="text-2xl mb-2">{category.icon}</div>
                <div className="text-sm font-medium text-gray-700">{category.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gray-50 rounded-2xl p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              使用流程
            </h2>
            <p className="text-lg text-gray-600">
              三步驟完成專業受眾分析
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">上傳產品圖片</h3>
              <p className="text-gray-600">
                拖拽或點擊上傳您的產品圖片，系統自動優化處理
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">AI 智能分析</h3>
              <p className="text-gray-600">
                多模態深度學習識別產品特徵，分類目標受眾
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">獲取受眾建議</h3>
              <p className="text-gray-600">
                基於真實 Facebook 數據，提供精準受眾定位策略
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-8 mb-16">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">100+</div>
            <div className="text-gray-600">日活躍用戶</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">5000+</div>
            <div className="text-gray-600">產品分析次數</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">95%</div>
            <div className="text-gray-600">分析準確率</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">50%+</div>
            <div className="text-gray-600">轉換率提升</div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            開始您的精準廣告投放之旅
          </h2>
          <p className="text-xl mb-8 opacity-90">
            立即體驗 AI 驅動的廣告受眾分析服務
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
              onClick={() => window.location.href = '/api/auth/google'}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              使用 Google 帳號登入
            </Button>
          </div>
          
          <div className="mt-6 text-sm text-white/80">
            <p>✅ 整合 eccal.thinkwithblack.com 統一認證系統</p>
            <p>新用戶首次登入即可獲得 30 點數獎勵</p>
          </div>
        </div>
      </div>
    </div>
  );
}