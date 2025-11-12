import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, Calendar, TrendingUp } from "lucide-react";

export default function History() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // 移除重定向邏輯，由 App.tsx 統一處理認證狀態

  const { data: analyses, isLoading: analysesLoading } = useQuery({
    queryKey: ["/api/analyses", { limit: 20 }],
    enabled: isAuthenticated,
    retry: false,
  });

  const handleViewAnalysis = (analysisId: number) => {
    // Navigate to analysis detail view
    console.log("View analysis:", analysisId);
    // You can implement a detail view modal or navigate to a detail page
  };

  const handleExportData = (analysis: any) => {
    const exportData = {
      productName: analysis.productName,
      productCategory: analysis.productCategory,
      targetAudience: analysis.targetAudience,
      keywords: analysis.keywords,
      confidence: analysis.confidence,
      analysisDate: analysis.createdAt,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysis.productName}-analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900">分析歷史</h2>
            <p className="text-neutral-600 mt-1">查看您過往的商品分析記錄</p>
          </div>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>分析記錄</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysesLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 bg-neutral-50 rounded-lg">
                      <div className="w-16 h-16 bg-neutral-200 rounded-lg animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-neutral-200 rounded animate-pulse"></div>
                        <div className="h-3 bg-neutral-200 rounded w-1/2 animate-pulse"></div>
                      </div>
                      <div className="w-20 h-8 bg-neutral-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : analyses && analyses.length > 0 ? (
                <div className="space-y-4">
                  {analyses.map((analysis: any) => (
                    <div key={analysis.id} className="flex items-center space-x-4 p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                      <img 
                        src={analysis.imageUrl} 
                        alt={analysis.productName}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-neutral-900">{analysis.productName}</h3>
                        <p className="text-sm text-neutral-600">
                          {new Date(analysis.createdAt).toLocaleDateString('zh-TW')}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant={analysis.isConfirmed ? "default" : "secondary"}>
                            {analysis.isConfirmed ? "已確認" : "待確認"}
                          </Badge>
                          <span className="text-xs text-neutral-500">
                            信心度: {Math.round(parseFloat(analysis.confidence) * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewAnalysis(analysis.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          查看
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleExportData(analysis)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          導出
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">尚無分析記錄</h3>
                  <p className="text-neutral-600 mb-4">
                    開始上傳商品圖片進行分析吧！
                  </p>
                  <Button onClick={() => window.location.href = '/analysis'}>
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
