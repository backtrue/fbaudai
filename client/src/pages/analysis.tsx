import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { trackEvent } from "@/lib/analytics";
import { SEOHead } from "@/components/SEOHead";
import { getPageSEO, getAnalysisSEO } from "@/lib/seo";
import { Sidebar } from "@/components/Sidebar";
import { FileUpload } from "@/components/FileUpload";
import { AudienceRecommendations } from "@/components/AudienceRecommendations";
import { AudienceRecommendationsSkeleton } from "@/components/AudienceRecommendationsSkeleton";
import { PersonaCreativePanel } from "@/components/PersonaCreativePanel";
import { PersonaCreativeSkeleton } from "@/components/PersonaCreativeSkeleton";
import { ProductConfirmationForm, type ConfirmationFormValues } from "@/components/ProductConfirmationForm";
import { LoadingModal } from "@/components/LoadingModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Analysis() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [analysisStep, setAnalysisStep] = useState<'upload' | 'confirm' | 'processing' | 'personas' | 'audiences-loading' | 'audiences'>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [confirmationValues, setConfirmationValues] = useState<ConfirmationFormValues | null>(null);

  // 移除重定向邏輯，由 App.tsx 統一處理認證狀態

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
    retry: false,
  });

  const analyzeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/analyze", formData);
      return response.json();
    },
    onSuccess: (data) => {
      trackEvent('analysis_complete', 'analysis', 'product_image');
      setCurrentAnalysis({
        ...data,
        confirmation: confirmationValues,
      });
      setAnalysisStep('personas');
      trackEvent('persona_panel_view', 'analysis', 'creative_result');
      toast({
        title: "分析完成",
        description: "AI 已成功分析您的商品圖片",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "認證失敗",
          description: "請重新登入",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "分析失敗",
        description: "請稍後再試或聯繫客服",
        variant: "destructive",
      });
      setAnalysisStep('confirm');
    },
  });

  const generateAudiencesMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/generate-audiences", data);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentAnalysis(prev => ({ ...prev, recommendations: data.recommendations }));
      setAnalysisStep('audiences');
      trackEvent('audience_recommendations_view', 'analysis', 'facebook_audience');
      toast({
        title: "受眾建議生成完成",
        description: `已生成 ${data.recommendations.length} 組廣告受眾建議`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "認證失敗",
          description: "請重新登入",
          variant: "destructive",
        });
        // 由 App.tsx 處理認證狀態，移除重定向
        return;
      }
      
      // Check for Facebook API token expiration
      if (error.message.includes('token') || error.message.includes('expired') || error.message.includes('OAuth')) {
        toast({
          title: "Facebook API Token 問題",
          description: "目前使用的是會過期的 token，請參考系統文件設定永久 System User Token",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "生成失敗",
        description: "請稍後再試或聯繫客服",
        variant: "destructive",
      });
    },
  });

  const isProUser = user?.membership === 'pro' || user?.membership === 'premium';

  const handleFilesUpload = (files: File[]) => {
    trackEvent('file_upload', 'analysis', 'product_image');
    setUploadedFiles(files);
    setCurrentAnalysis(null);
    setConfirmationValues(null);

    if (files.length === 0) {
      toast({
        title: "尚未選擇圖片",
        description: "請選擇至少一張圖片後再繼續",
        variant: "destructive",
      });
      return;
    }

    setAnalysisStep('confirm');
  };

  const handleConfirmSubmit = (values: ConfirmationFormValues) => {
    if (!uploadedFiles.length) {
      toast({
        title: "缺少圖片",
        description: "請先返回重新選擇圖片。",
        variant: "destructive",
      });
      return;
    }

    setConfirmationValues(values);
    trackEvent('product_confirmation_submit', 'analysis', 'product_image');

    const formData = new FormData();
    uploadedFiles.forEach((file) => formData.append('images', file));
    formData.append('productNameHint', values.productNameHint);
    formData.append('confirmedProductName', values.confirmedProductName);
    formData.append('enableFallback', String(values.enableFallback));
    formData.append('isConfirmed', String(values.isConfirmed));
    if (values.priceRange) {
      formData.append('priceRange', values.priceRange);
    }
    if (values.salesRegion) {
      formData.append('salesRegion', values.salesRegion);
    }

    setAnalysisStep('processing');
    analyzeMutation.mutate(formData);
  };

  const handleGenerateAudiences = () => {
    if (!currentAnalysis?.analysis?.id) return;

    trackEvent('generate_audiences', 'analysis', 'facebook_audience');
    setAnalysisStep('audiences-loading');
    generateAudiencesMutation.mutate({
      analysisId: currentAnalysis.analysis.id,
      productName: currentAnalysis.analysis.productName,
      productCategory: currentAnalysis.analysis.productCategory,
      targetAudience: currentAnalysis.analysis.targetAudience,
      keywords: currentAnalysis.analysis.keywords,
      priceRange: currentAnalysis.analysis.priceRange,
      salesRegion: currentAnalysis.analysis.salesRegion,
    });
  };

  const handleStartOver = () => {
    setCurrentAnalysis(null);
    setUploadedFiles([]);
    setConfirmationValues(null);
    setAnalysisStep('upload');
    analyzeMutation.reset();
    generateAudiencesMutation.reset();
  };

  // 暫時移除認證檢查以進行測試
  // if (isLoading || !isAuthenticated) {
  //   return (
  //     <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
  //       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  //     </div>
  //   );
  // }

  const canAnalyze = true; // 暫時設為 true 以進行測試
  // const canAnalyze = stats && stats.currentMonthAnalyses < stats.monthlyLimit;

  const seoConfig = currentAnalysis?.analysis ? 
    getAnalysisSEO(currentAnalysis.analysis) : 
    getPageSEO('analysis');

  return (
    <div className="flex h-screen bg-neutral-50">
      <SEOHead {...seoConfig} />
      <Sidebar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900">圖片分析</h2>
            <p className="text-neutral-600 mt-1">上傳商品圖片，開始 AI 分析</p>
          </div>

          {/* Usage Warning */}
          {stats && !canAnalyze && (
            <Card className="mb-8 border-orange-200 bg-orange-50">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 font-medium">!</span>
                  </div>
                  <div>
                    <p className="font-medium text-orange-900">本月使用量已達上限</p>
                    <p className="text-sm text-orange-700">
                      您本月已使用 {stats.currentMonthAnalyses} 次分析（上限: {stats.monthlyLimit} 次）
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content */}
          {analysisStep === 'upload' && (
            <FileUpload 
              onFilesUpload={handleFilesUpload}
              disabled={!canAnalyze || analyzeMutation.isPending}
              maxFiles={10}
            />
          )}

          {analysisStep === 'confirm' && uploadedFiles.length > 0 && (
            <ProductConfirmationForm
              files={uploadedFiles}
              isSubmitting={analyzeMutation.isPending}
              isProUser={isProUser}
              initialValues={confirmationValues ?? undefined}
              onSubmit={handleConfirmSubmit}
              onBack={handleStartOver}
            />
          )}

          {analysisStep === 'processing' && (
            <PersonaCreativeSkeleton />
          )}

          {analysisStep === 'personas' && currentAnalysis && (
            <PersonaCreativePanel
              analysis={currentAnalysis}
              isProUser={isProUser}
              onGenerateAudiences={handleGenerateAudiences}
              onStartOver={handleStartOver}
              isGenerating={generateAudiencesMutation.isPending}
            />
          )}

          {analysisStep === 'audiences-loading' && (
            <AudienceRecommendationsSkeleton />
          )}

          {analysisStep === 'audiences' && currentAnalysis && (
            <AudienceRecommendations 
              analysis={currentAnalysis}
              recommendations={currentAnalysis.recommendations}
              onStartOver={handleStartOver}
            />
          )}
        </div>
      </div>

      {/* Loading Modal */}
      <LoadingModal 
        isOpen={false}
        title=""
        description=""
      />
    </div>
  );
}
