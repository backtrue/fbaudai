import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery } from "@tanstack/react-query";
import { SEOHead } from "@/components/SEOHead";
import { getPageSEO } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, Users, Target, Calendar, Clock } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { useEffect } from "react";

export default function Stats() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // 移除重定向邏輯，由 App.tsx 統一處理認證狀態

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: recentAnalyses, isLoading: analysesLoading } = useQuery({
    queryKey: ["/api/analyses", { limit: 10 }],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const usagePercentage = stats ? (stats.currentMonthAnalyses / stats.monthlyLimit) * 100 : 0;

  return (
    <div className="flex h-screen bg-neutral-50">
      <SEOHead {...getPageSEO('stats')} />
      <Sidebar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900">使用統計</h2>
            <p className="text-neutral-600 mt-1">查看您的 Facebook 廣告受眾分析使用情況</p>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-neutral-600">總分析次數</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {statsLoading ? "..." : stats?.totalAnalyses || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-neutral-600">產生受眾數</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {statsLoading ? "..." : stats?.totalAudiences || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-neutral-600">本月分析</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {statsLoading ? "..." : stats?.currentMonthAnalyses || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Target className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-neutral-600">使用率</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {statsLoading ? "..." : `${Math.round(usagePercentage)}%`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Progress */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                本月使用進度
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>已使用 {stats?.currentMonthAnalyses || 0} 次</span>
                  <span>總共 {stats?.monthlyLimit || 0} 次</span>
                </div>
                <Progress value={usagePercentage} className="h-2" />
                <p className="text-sm text-neutral-600">
                  {stats?.monthlyLimit && stats?.currentMonthAnalyses 
                    ? `還剩 ${stats.monthlyLimit - stats.currentMonthAnalyses} 次分析`
                    : '載入中...'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Analyses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                最近分析記錄
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-neutral-600 mt-2">載入中...</p>
                </div>
              ) : recentAnalyses && recentAnalyses.length > 0 ? (
                <div className="space-y-4">
                  {recentAnalyses.map((analysis: any) => (
                    <div key={analysis.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-neutral-900">
                          {analysis.aiAnalysis?.productName || '未知商品'}
                        </h4>
                        <p className="text-sm text-neutral-600">
                          {analysis.aiAnalysis?.productCategory?.join(', ') || '無分類'}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {new Date(analysis.createdAt).toLocaleDateString('zh-TW', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {analysis.aiAnalysis?.confidence ? 
                            `${Math.round(analysis.aiAnalysis.confidence * 100)}%` : 
                            'N/A'
                          }
                        </Badge>
                        <Badge variant="outline">
                          {analysis.audienceRecommendations?.length || 0} 受眾
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-neutral-600">尚未有分析記錄</p>
                  <Button className="mt-4" onClick={() => window.location.href = '/analysis'}>
                    開始分析
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}