import { useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CircleCheck, Rocket, Users, Sparkles, ArrowUpRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import type { ConfirmationFormValues } from "@/components/ProductConfirmationForm";

interface ClusterSummary {
  clusterId: string;
  clusterName: string;
  coreMessage: string;
  supportingAssets: number[];
  headlineExample: string;
  recommendedKeywords: string[];
  confidence: number;
}

interface PersonaInsight {
  personaName: string;
  coreNeed: string;
  keyMotivation: string[];
  coverageStatus: "covered" | "gap";
  linkedClusters: string[];
}

interface CreativeBrief {
  personaName: string;
  headlineHook: string;
  coreMessage: string;
  copyIdeas: string[];
  visualDirection: string[];
  ctaSuggestion: string;
}

interface FallbackSummary {
  summary: string;
  confidence: number;
}

interface CostMetrics {
  openaiInputTokens: number;
  openaiOutputTokens: number;
  googleVisionCalls: number;
  metaQueries: number;
}

interface CostBreakdown {
  openaiCostUsd: number;
  googleVisionCostUsd: number;
  totalCostUsd: number;
  totalCostJpy: number;
  estimatedCredits: number;
}

interface CostSummary {
  metrics: CostMetrics;
  breakdown: CostBreakdown;
  buffered?: CostBreakdown;
}

interface AnalysisRecord {
  id: string;
  productName: string;
  productCategory: string[];
  targetAudience: string[];
  keywords: string[];
  priceRange?: string | null;
  salesRegion?: string | null;
  confidence?: number;
}

interface AnalysisImage {
  id?: string;
  imageUrl: string;
  position: number;
  googleVisionObjects?: string[];
  googleVisionLabels?: string[];
  dominantColors?: string[];
}

interface CreativeResult {
  clusters: ClusterSummary[];
  personas: PersonaInsight[];
  creativeBriefs: CreativeBrief[];
  fallbackSummary?: FallbackSummary;
  cost: CostSummary;
}

interface AnalysisResponse {
  analysis: AnalysisRecord;
  images: AnalysisImage[];
  creativeResult: CreativeResult;
  confirmation?: ConfirmationFormValues | null;
}

interface PersonaCreativePanelProps {
  analysis: AnalysisResponse;
  isProUser: boolean;
  isGenerating: boolean;
  onGenerateAudiences: () => void;
  onStartOver: () => void;
}

function formatPercentage(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }
  return `${Math.round(value * 100)}%`;
}

function formatCurrency(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }
  return `$${value.toFixed(2)}`;
}

function formatCredits(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }
  return `${value.toFixed(1)} 點`;
}

export function PersonaCreativePanel({
  analysis,
  isProUser,
  isGenerating,
  onGenerateAudiences,
  onStartOver,
}: PersonaCreativePanelProps) {
  const clusters = analysis.creativeResult?.clusters ?? [];
  const personas = analysis.creativeResult?.personas ?? [];
  const creativeBriefs = analysis.creativeResult?.creativeBriefs ?? [];
  const fallbackSummary = analysis.creativeResult?.fallbackSummary;
  const cost = analysis.creativeResult?.cost;

  const imageMap = useMemo(() => {
    const map = new Map<number, AnalysisImage>();
    (analysis.images ?? []).forEach((image) => {
      map.set(image.position, image);
    });
    return map;
  }, [analysis.images]);

  const renderClusterImagePreviews = (supportingAssets: number[]) => {
    const images = supportingAssets
      .map((index) => imageMap.get(index))
      .filter((item): item is AnalysisImage => Boolean(item));

    if (images.length === 0) {
      return (
        <p className="text-xs text-neutral-500">
          尚未擷取相對應的素材縮圖。
        </p>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {images.map((image) => (
          <div key={image.position} className="rounded-lg overflow-hidden border border-neutral-200">
            <img
              src={image.imageUrl}
              alt={`素材 ${image.position + 1}`}
              className="w-full h-24 object-cover"
            />
          </div>
        ))}
      </div>
    );
  };

  const renderCoverageBadge = (status: PersonaInsight["coverageStatus"]) => {
    if (status === "covered") {
      return <Badge className="bg-emerald-100 text-emerald-700">已覆蓋</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-700">尚未覆蓋</Badge>;
  };

  const hasProInsights = personas.length > 0 || creativeBriefs.length > 0;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>分析總覽</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">
                {analysis.analysis.productName}
              </h3>
              <p className="text-sm text-neutral-600">
                信心度 {formatPercentage(analysis.analysis.confidence)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.analysis.productCategory.map((category) => (
                <Badge key={category} variant="secondary">
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-neutral-600">
            <div>
              <p className="font-medium text-neutral-900">目標族群</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {analysis.analysis.targetAudience.map((audience) => (
                  <Badge key={audience} variant="outline">
                    {audience}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium text-neutral-900">關鍵字</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {analysis.analysis.keywords.map((keyword) => (
                  <Badge key={keyword} variant="outline" className="border-purple-200 text-purple-700">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
            {analysis.analysis.priceRange && (
              <div>
                <p className="font-medium text-neutral-900">價格區間</p>
                <p className="mt-2">{analysis.analysis.priceRange}</p>
              </div>
            )}
            {analysis.analysis.salesRegion && (
              <div>
                <p className="font-medium text-neutral-900">主要銷售地區</p>
                <p className="mt-2">{analysis.analysis.salesRegion}</p>
              </div>
            )}
          </div>

          {analysis.confirmation && (
            <div className="rounded-lg bg-neutral-100 border border-neutral-200 p-4 text-sm text-neutral-700">
              <p className="font-medium text-neutral-900 mb-2">使用者確認</p>
              <p>A 步：{analysis.confirmation.productNameHint}</p>
              <p>B 步：{analysis.confirmation.confirmedProductName}</p>
              <p>
                狀態：{analysis.confirmation.isConfirmed ? "已確認" : "尚未確認"}
                {analysis.confirmation.enableFallback ? "，已啟用 Fallback C" : ""}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            區塊 1：重疊性分析
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {clusters.length === 0 ? (
            <p className="text-sm text-neutral-600">尚未產生創意集群，請稍後再試。</p>
          ) : (
            clusters.map((cluster) => (
              <div key={cluster.clusterId} className="rounded-lg border border-neutral-200 p-4 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-semibold text-neutral-900">{cluster.clusterName}</h4>
                    <p className="text-sm text-neutral-600 mt-2">{cluster.coreMessage}</p>
                  </div>
                  <div className="text-sm text-neutral-600">
                    <p>信心度 {formatPercentage(cluster.confidence)}</p>
                    <p className="mt-2">
                      範例標題：
                      <span className="font-medium text-neutral-900 ml-1">{cluster.headlineExample}</span>
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-neutral-900 mb-2">推薦關鍵字</p>
                  <div className="flex flex-wrap gap-2">
                    {cluster.recommendedKeywords.map((keyword) => (
                      <Badge key={keyword} variant="outline" className="border-blue-200 text-blue-700">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-neutral-900 mb-2">關聯素材</p>
                  {renderClusterImagePreviews(cluster.supportingAssets)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            區塊 2：Persona 覆蓋度分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isProUser ? (
            personas.length === 0 ? (
              <p className="text-sm text-neutral-600">
                尚未產生 Persona 洞察，請稍後重新整理或調整素材。
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {personas.map((persona) => (
                  <div key={persona.personaName} className="rounded-lg border border-neutral-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-semibold text-neutral-900">{persona.personaName}</h4>
                      {renderCoverageBadge(persona.coverageStatus)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">核心需求</p>
                      <p className="text-sm text-neutral-600 mt-1">{persona.coreNeed}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">關鍵動機</p>
                      <ul className="list-disc list-inside text-sm text-neutral-600 mt-1 space-y-1">
                        {persona.keyMotivation.map((motivation, index) => (
                          <li key={index}>{motivation}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">關聯集群</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {persona.linkedClusters.map((clusterId) => (
                          <Badge key={clusterId} variant="outline">
                            {clusterId}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center space-y-3">
              <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
              <p className="text-sm text-neutral-600">
                升級 Pro 會員即可解鎖 Persona 覆蓋度分析，了解哪些族群已被創意覆蓋。
              </p>
              <p className="text-xs text-neutral-500">Pro 功能包含 Persona 洞察與 AI 創意建議。</p>
              <Button
                variant="default"
                className="inline-flex items-center gap-2"
                onClick={() => {
                  trackEvent('upgrade_cta_click', 'analysis', 'persona_panel');
                  window.open('/settings?tab=membership', '_blank');
                }}
              >
                升級為 Pro
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-fuchsia-500" />
            區塊 3：AI 創意建議
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isProUser ? (
            creativeBriefs.length === 0 ? (
              <p className="text-sm text-neutral-600">
                尚未產生 AI 創意建議，請稍後重新整理或調整素材。
              </p>
            ) : (
              <div className="space-y-4">
                {creativeBriefs.map((brief) => (
                  <div key={`${brief.personaName}-${brief.headlineHook}`} className="rounded-lg border border-neutral-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-semibold text-neutral-900">
                        {brief.personaName}
                      </h4>
                      <Badge variant="secondary">創意方向</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">主標題 Hook</p>
                      <p className="text-sm text-neutral-600 mt-1">{brief.headlineHook}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">核心訊息</p>
                      <p className="text-sm text-neutral-600 mt-1 whitespace-pre-line">{brief.coreMessage}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">文案靈感</p>
                      <ul className="list-disc list-inside text-sm text-neutral-600 mt-1 space-y-1">
                        {brief.copyIdeas.map((idea, index) => (
                          <li key={index}>{idea}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">視覺方向</p>
                      <ul className="list-disc list-inside text-sm text-neutral-600 mt-1 space-y-1">
                        {brief.visualDirection.map((direction, index) => (
                          <li key={index}>{direction}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">CTA 建議</p>
                      <p className="text-sm text-neutral-600 mt-1">{brief.ctaSuggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center space-y-3">
              <Sparkles className="w-6 h-6 text-fuchsia-500 mx-auto" />
              <p className="text-sm text-neutral-600">
                升級 Pro 會員即可解鎖 AI 創意建議，取得 headline、文案與視覺方向。
              </p>
              <p className="text-xs text-neutral-500">支援 2-3 組創意方向，助您快速開發廣告素材。</p>
              <Button
                variant="default"
                className="inline-flex items-center gap-2"
                onClick={() => {
                  trackEvent('upgrade_cta_click', 'analysis', 'creative_panel');
                  window.open('/settings?tab=membership', '_blank');
                }}
              >
                升級為 Pro
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {fallbackSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleCheck className="w-5 h-5 text-sky-500" />
              Fallback C：產品整體摘要
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-neutral-700">
            <p className="whitespace-pre-line">{fallbackSummary.summary}</p>
            <p className="text-neutral-500 text-xs">
              信心度 {formatPercentage(fallbackSummary.confidence)}
            </p>
          </CardContent>
        </Card>
      )}

      {cost && (
        <Card>
          <CardHeader>
            <CardTitle>成本估算</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-neutral-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-neutral-200 p-4">
                <p className="font-medium text-neutral-900 mb-2">模型使用量</p>
                <ul className="space-y-1">
                  <li>OpenAI Input Tokens：{cost.metrics.openaiInputTokens.toLocaleString()}</li>
                  <li>OpenAI Output Tokens：{cost.metrics.openaiOutputTokens.toLocaleString()}</li>
                  <li>Google Vision Calls：{cost.metrics.googleVisionCalls.toLocaleString()}</li>
                  <li>Meta Graph Queries：{cost.metrics.metaQueries.toLocaleString()}</li>
                </ul>
              </div>
              <div className="rounded-lg border border-neutral-200 p-4">
                <p className="font-medium text-neutral-900 mb-2">費用預估</p>
                <ul className="space-y-1">
                  <li>OpenAI 成本：{formatCurrency(cost.breakdown.openaiCostUsd)}</li>
                  <li>Google Vision 成本：{formatCurrency(cost.breakdown.googleVisionCostUsd)}</li>
                  <li className="font-semibold text-neutral-900">
                    總成本 (USD)：{formatCurrency(cost.breakdown.totalCostUsd)}
                  </li>
                  <li>總成本 (JPY)：¥{cost.breakdown.totalCostJpy.toFixed(0)}</li>
                  <li>估算 Credits：{formatCredits(cost.breakdown.estimatedCredits)}</li>
                </ul>
              </div>
            </div>
            {cost.buffered && (
              <div className="rounded-lg border border-dashed border-neutral-300 p-3 text-xs text-neutral-500">
                <p className="font-medium text-neutral-700">含緩衝成本 (30%)</p>
                <p className="mt-1">
                  總成本 (USD)：{formatCurrency(cost.buffered.totalCostUsd)}、估算 Credits：
                  {formatCredits(cost.buffered.estimatedCredits)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-sm text-neutral-600 text-center sm:text-left">
            <p className="font-medium text-neutral-900">下一步</p>
            <p>使用分析結果生成 Facebook 廣告受眾，直接套用於廣告組。</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={onStartOver}>
              重新開始
            </Button>
            <Button onClick={onGenerateAudiences} disabled={isGenerating}>
              {isGenerating ? "生成中..." : "生成廣告受眾"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
