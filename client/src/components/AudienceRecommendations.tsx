import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, Copy, RotateCcw, Lightbulb } from "lucide-react";

interface AudienceRecommendationsProps {
  analysis: any;
  recommendations: any[];
  onStartOver: () => void;
}

export function AudienceRecommendations({ 
  analysis, 
  recommendations, 
  onStartOver 
}: AudienceRecommendationsProps) {
  const { toast } = useToast();

  const handleCopyAudience = (audience: any) => {
    const audienceText = `${audience.audienceName} (${audience.audienceType})`;
    navigator.clipboard.writeText(audienceText);
    toast({
      title: "已複製",
      description: `已複製受眾: ${audience.audienceName}`,
    });
  };

  const handleExportJSON = () => {
    const exportData = {
      analysis: {
        productName: analysis.analysis.productName,
        productCategory: analysis.analysis.productCategory,
        targetAudience: analysis.analysis.targetAudience,
        keywords: analysis.analysis.keywords,
        confidence: analysis.analysis.confidence,
      },
      recommendations: recommendations.map(rec => ({
        audienceType: rec.audienceType,
        audienceName: rec.audienceName,
        audienceId: rec.audienceId,
        audienceSize: rec.audienceSize,
        usageNote: rec.usageNote,
        isVerified: rec.isVerified,
      })),
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysis.analysis.productName}-audiences.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "匯出成功",
      description: "受眾建議已匯出為 JSON 檔案",
    });
  };

  const getAudienceTypeColor = (type: string) => {
    switch (type) {
      case 'interests':
        return 'bg-blue-100 text-blue-800';
      case 'behaviors':
        return 'bg-purple-100 text-purple-800';
      case 'demographics':
        return 'bg-orange-100 text-orange-800';
      case 'brands':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAudienceTypeLabel = (type: string) => {
    switch (type) {
      case 'interests':
        return '興趣';
      case 'behaviors':
        return '行為';
      case 'demographics':
        return '人口統計';
      case 'brands':
        return '品牌';
      default:
        return type;
    }
  };

  const formatAudienceSize = (size: number) => {
    if (size >= 1000000) {
      return `${(size / 1000000).toFixed(1)}M`;
    } else if (size >= 1000) {
      return `${(size / 1000).toFixed(0)}K`;
    } else {
      return size.toString();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Facebook 廣告受眾建議</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onStartOver}>
                <RotateCcw className="w-4 h-4 mr-2" />
                重新開始
              </Button>
              <Button variant="outline" onClick={handleExportJSON}>
                <Download className="w-4 h-4 mr-2" />
                匯出 JSON
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Recommendations Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left p-4 font-medium text-neutral-700">受眾類型</th>
                  <th className="text-left p-4 font-medium text-neutral-700">受眾名稱</th>
                  <th className="text-left p-4 font-medium text-neutral-700">受眾規模</th>
                  <th className="text-left p-4 font-medium text-neutral-700">驗證狀態</th>
                  <th className="text-left p-4 font-medium text-neutral-700">用途建議</th>
                  <th className="text-left p-4 font-medium text-neutral-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {recommendations.map((recommendation, index) => (
                  <tr key={index} className="hover:bg-neutral-50">
                    <td className="p-4">
                      <Badge className={getAudienceTypeColor(recommendation.audienceType)}>
                        {getAudienceTypeLabel(recommendation.audienceType)}
                      </Badge>
                    </td>
                    <td className="p-4 font-medium">{recommendation.audienceName}</td>
                    <td className="p-4">
                      <span className="text-green-600 font-medium">
                        {formatAudienceSize(recommendation.audienceSize || 0)}
                      </span>
                      <span className="text-neutral-500 ml-1">人</span>
                    </td>
                    <td className="p-4">
                      <Badge variant={recommendation.isVerified ? "default" : "secondary"}>
                        {recommendation.isVerified ? "已驗證" : "未驗證"}
                      </Badge>
                    </td>
                    <td className="p-4 text-neutral-600">{recommendation.usageNote}</td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyAudience(recommendation)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Suggestion */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Lightbulb className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h4 className="font-medium text-neutral-900 mb-2">建議策略</h4>
              <p className="text-sm text-neutral-600">
                建議使用多組受眾進行 A/B 測試，先從{" "}
                <span className="font-medium">
                  {recommendations.find(r => r.audienceType === 'interests')?.audienceName || '核心興趣'}
                </span>{" "}
                開始投放，再逐步擴展到品牌受眾和行為受眾。建議每組廣告設定不同的預算和創意素材以比較效果。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
