import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, TrendingUp, Zap, CheckCircle, Star } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { getPageSEO } from "@/lib/seo";

export default function LandingSimple() {
  const handleGoogleLogin = () => {
    console.log('開始 Google SSO 登入流程...');
    const loginUrl = window.location.origin + '/api/auth/google';
    console.log('登入 URL:', loginUrl);
    window.location.href = loginUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <SEOHead {...getPageSEO('landing')} />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            報受眾 - AI 廣告受眾分析平台
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            上傳一張圖，讓 AI 幫你找到會買單的客人
          </p>
        </header>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-4">
                <Target className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              專業 AI 分析，精準找到目標受眾
            </h2>
            
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              基於 邱煜庭小黑老師 15 年 Facebook 廣告經驗，結合先進 AI 技術，
              為您的產品找到最精準的廣告受眾
            </p>

            <Button 
              onClick={handleGoogleLogin}
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-semibold rounded-lg shadow-lg transition-all duration-200"
            >
              開始使用 - Google 登入
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto bg-green-100 dark:bg-green-900 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
                <Zap className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-xl">AI 智能分析</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                使用先進的 AI 視覺識別技術，精準分析產品特徵和目標客群
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto bg-purple-100 dark:bg-purple-900 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-xl">精準受眾推薦</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                基於真實 Facebook API 數據，提供可直接使用的受眾定位建議
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto bg-orange-100 dark:bg-orange-900 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-xl">專家經驗加持</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                融合 15 年 Facebook 廣告實戰經驗，確保推薦的準確性和實用性
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-16">
          <h3 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
            三步驟輕鬆完成
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">1</span>
              </div>
              <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">上傳產品圖片</h4>
              <p className="text-gray-600 dark:text-gray-300">
                上傳您的產品照片，AI 開始分析
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 dark:text-green-400 font-bold text-lg">2</span>
              </div>
              <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">AI 智能分析</h4>
              <p className="text-gray-600 dark:text-gray-300">
                深度分析產品特徵和目標客群
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-600 dark:text-purple-400 font-bold text-lg">3</span>
              </div>
              <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">獲得受眾建議</h4>
              <p className="text-gray-600 dark:text-gray-300">
                取得精準的 Facebook 受眾定位建議
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              立即開始分析您的產品
            </h3>
            <p className="text-lg mb-6 opacity-90">
              讓 AI 為您找到最精準的廣告受眾，提升廣告效果
            </p>
            <Button 
              onClick={handleGoogleLogin}
              size="lg" 
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
            >
              開始使用 - Google 登入
            </Button>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500 dark:text-gray-400">
          <p>© 2025 報受眾 - AI 廣告受眾分析平台</p>
        </footer>
      </div>
    </div>
  );
}