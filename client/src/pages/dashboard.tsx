import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery } from "@tanstack/react-query";
import { SEOHead } from "@/components/SEOHead";
import { getPageSEO } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Image, Users, Target, Clock, TrendingUp } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // 移除重定向邏輯，由 App.tsx 統一處理認證狀態

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: recentAnalyses, isLoading: analysesLoading } = useQuery({
    queryKey: ["/api/analyses", { limit: 3 }],
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
      <SEOHead {...getPageSEO('dashboard')} />
      <Sidebar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900">報受眾 - 儀表板</h2>
            <p className="text-neutral-600 mt-1">AI 驅動的廣告受眾分析，提升您的廣告投放效果</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Image className="w-5 h-5 text-primary" />
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
                  <div className="p-3 bg-secondary/10 rounded-lg">
                    <Users className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-neutral-600">建議受眾</p>
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
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <Target className="w-5 h-5 text-accent" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-neutral-600">準確率</p>
                    <p className="text-2xl font-bold text-neutral-900">94.5%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <Clock className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-neutral-600">平均處理時間</p>
                    <p className="text-2xl font-bold text-neutral-900">2.3s</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Stats */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>本月使用量</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">分析次數</span>
                  <span className="text-sm font-medium text-primary">
                    {stats?.currentMonthAnalyses || 0} / {stats?.monthlyLimit || 50}
                  </span>
                </div>
                <Progress value={usagePercentage} className="h-2" />
                <p className="text-xs text-neutral-500">
                  剩餘 {(stats?.monthlyLimit || 50) - (stats?.currentMonthAnalyses || 0)} 次分析
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Analyses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>最近分析</CardTitle>
                <a href="/history" className="text-primary hover:text-primary/80 text-sm font-medium">
                  查看全部
                </a>
              </div>
            </CardHeader>
            <CardContent>
              {analysesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-neutral-200 rounded-lg animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-neutral-200 rounded animate-pulse"></div>
                        <div className="h-3 bg-neutral-200 rounded w-1/2 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentAnalyses && recentAnalyses.length > 0 ? (
                <div className="space-y-4">
                  {recentAnalyses.map((analysis: any) => (
                    <div key={analysis.id} className="flex items-center space-x-4 p-4 bg-neutral-50 rounded-lg">
                      <img 
                        src={analysis.imageUrl} 
                        alt={analysis.productName}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900">{analysis.productName}</p>
                        <p className="text-sm text-neutral-600">
                          {new Date(analysis.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={analysis.isConfirmed ? "default" : "secondary"}>
                          {analysis.isConfirmed ? "已確認" : "待確認"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-600">尚未有分析記錄</p>
                  <p className="text-sm text-neutral-500 mt-2">
                    <a href="/analysis" className="text-primary hover:text-primary/80">
                      立即開始分析
                    </a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
