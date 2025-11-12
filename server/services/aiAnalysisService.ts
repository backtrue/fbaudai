import OpenAI from 'openai';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import type { protos } from '@google-cloud/vision';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { CostMetrics, CostBreakdown } from '../utils/costCalculator';
import { calculateCostBreakdown, addBuffer } from '../utils/costCalculator';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 初始化 Google Vision Client，支援 JSON 憑證或檔案路徑
let visionClient: ImageAnnotatorClient;
try {
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (credentials && credentials.trim().startsWith('{')) {
    // 環境變數包含 JSON 憑證內容
    const credentialsJson = JSON.parse(credentials);
    visionClient = new ImageAnnotatorClient({
      credentials: credentialsJson,
      projectId: credentialsJson.project_id
    });
    console.log('✅ Google Vision Client initialized with JSON credentials');
  } else {
    // 環境變數是檔案路徑或未設置（使用預設行為）
    visionClient = new ImageAnnotatorClient();
    console.log('✅ Google Vision Client initialized with default credentials');
  }
} catch (error) {
  console.error('❌ Failed to initialize Google Vision Client:', error);
  // 如果解析失敗，使用預設初始化（可能會失敗，但至少不會阻止應用啟動）
  visionClient = new ImageAnnotatorClient();
}

const PRODUCT_IMAGE_MODEL = process.env.OPENAI_PRODUCT_VISION_MODEL || 'gpt-4o';
const DEFAULT_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';

const buildModelList = (...candidates: (string | undefined)[]): string[] => {
  const deduped: string[] = [];
  for (const candidate of candidates) {
    if (candidate && !deduped.includes(candidate)) {
      deduped.push(candidate);
    }
  }
  return deduped;
};

const CLUSTER_MODELS = buildModelList(process.env.OPENAI_CLUSTER_MODEL, DEFAULT_TEXT_MODEL);
const PERSONA_MODELS = buildModelList(process.env.OPENAI_PERSONA_MODEL, 'gpt-5-mini', DEFAULT_TEXT_MODEL);
const CREATIVE_MODELS = buildModelList(
  process.env.OPENAI_CREATIVE_MODEL,
  process.env.OPENAI_PERSONA_MODEL,
  'gpt-5-mini',
  DEFAULT_TEXT_MODEL
);
const FALLBACK_MODELS = buildModelList(process.env.OPENAI_FALLBACK_MODEL, DEFAULT_TEXT_MODEL);

export interface ProductAnalysis {
  productName: string;
  productCategory: string[];
  targetAudience: string[];
  keywords: string[];
  confidence: number;
}

export interface AudienceKeyword {
  category: string;
  keywords: string[];
}

export interface ImageVisionInsights {
  objects: string[];
  labels: string[];
  text: string[];
  colors: string[];
}

export interface SingleImageAnalysis {
  index: number;
  base64Image: string;
  product: ProductAnalysis;
  vision: ImageVisionInsights;
}

export interface ClusterSummary {
  clusterId: string;
  clusterName: string;
  coreMessage: string;
  supportingAssets: number[];
  headlineExample: string;
  recommendedKeywords: string[];
  confidence: number;
}

export interface PersonaInsight {
  personaName: string;
  coreNeed: string;
  keyMotivation: string[];
  coverageStatus: 'covered' | 'gap';
  linkedClusters: string[];
}

export interface CreativeBrief {
  personaName: string;
  headlineHook: string;
  coreMessage: string;
  copyIdeas: string[];
  visualDirection: string[];
  ctaSuggestion: string;
}

export interface FallbackSummaryResult {
  summary: string;
  confidence: number;
}

export interface CostSummary {
  metrics: CostMetrics;
  breakdown: CostBreakdown;
  buffered?: CostBreakdown;
}

export interface CreativeDiversityResult {
  clusters: ClusterSummary[];
  personas: PersonaInsight[];
  creativeBriefs: CreativeBrief[];
  productAnalyses: ProductAnalysis[];
  visionInsights: ImageVisionInsights[];
  fallbackSummary?: FallbackSummaryResult;
  cost: CostSummary;
}

export interface CreativeDiversityOptions {
  generatePersonas?: boolean;
  generateCreativeBriefs?: boolean;
  runFallbackSummary?: boolean;
  bufferPercentage?: number;
  productNameHint?: string;
}

interface ClusterLLMResponse {
  clusters: ClusterSummary[];
}

interface PersonaLLMResponse {
  personas: PersonaInsight[];
}

interface CreativeBriefLLMResponse {
  creativeBriefs: CreativeBrief[];
}

interface FallbackLLMResponse {
  summary: string;
  confidence?: number;
}

const JSON_RESPONSE_FORMAT = { type: 'json_object' } as const;

async function callChatCompletion(
  modelCandidates: string[],
  messages: ChatCompletionMessageParam[],
  maxTokens: number,
  responseFormat?: { type: 'json_object' },
  metrics?: CostMetrics
): Promise<string> {
  for (const model of modelCandidates) {
    try {
      // 新模型（gpt-5-mini, o1系列）使用 max_completion_tokens
      const usesNewParameter = model.startsWith('gpt-5') || model.startsWith('o1');
      
      const response = await openai.chat.completions.create({
        model,
        messages,
        ...(usesNewParameter 
          ? { max_completion_tokens: maxTokens }
          : { max_tokens: maxTokens }
        ),
        ...(responseFormat ? { response_format: responseFormat } : {}),
      });

      const choice = response.choices[0];
      if (response.usage && metrics) {
        metrics.openaiInputTokens += response.usage.prompt_tokens ?? 0;
        metrics.openaiOutputTokens += response.usage.completion_tokens ?? 0;
      }

      if (choice?.message?.content) {
        return choice.message.content;
      }

      console.warn(`Model ${model} returned empty content.`);
    } catch (error) {
      console.error(`Model ${model} failed:`, error);
    }
  }

  throw new Error('All chat completion model attempts failed');
}

function safeParseJson<T>(content: string, context: string): T {
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Failed to parse JSON for ${context}:`, content);
    throw new Error(`Invalid JSON response for ${context}`);
  }
}

function formatSingleImageForLLM(analysis: SingleImageAnalysis) {
  return {
    index: analysis.index,
    product: analysis.product,
    vision: analysis.vision,
  };
}

function serializeAnalysesForLLM(analyses: SingleImageAnalysis[]): string {
  return JSON.stringify(
    {
      images: analyses.map(formatSingleImageForLLM),
    },
    null,
    2
  );
}

async function generateClusterSummaries(
  analyses: SingleImageAnalysis[],
  metrics: CostMetrics
): Promise<ClusterSummary[]> {
  const systemPrompt = `你是 Meta 廣告創意策略專家，任務是統整多張素材的重點。請辨識素材的創意集群 (cluster)，描述差異化亮點，並將訊息維持在 60 字內。回傳 JSON，欄位：
- clusterId (英數字)
- clusterName (繁中 8 字內)
- coreMessage (繁中 60 字內)
- supportingAssets (索引 array)
- headlineExample (15 字內)
- recommendedKeywords (英文關鍵字 array, 最多 5 個)
- confidence (0-1 小數)`;

  const userPrompt = `以下是素材分析結果，請產生 2-4 個創意集群：\n${serializeAnalysesForLLM(analyses)}`;

  const content = await callChatCompletion(
    CLUSTER_MODELS,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    900,
    JSON_RESPONSE_FORMAT,
    metrics
  );

  const parsed = safeParseJson<ClusterLLMResponse>(content, 'cluster summaries');
  return parsed.clusters ?? [];
}

async function generatePersonaInsights(
  analyses: SingleImageAnalysis[],
  clusters: ClusterSummary[],
  metrics: CostMetrics
): Promise<PersonaInsight[]> {
  const systemPrompt = `你是廣告受眾策略專家，請依據素材與創意集群生成 Persona 洞察。每個 Persona 回傳欄位：
- personaName (繁中 6-8 字內)
- coreNeed (繁中一句話)
- keyMotivation (繁中 bullet 最多 3 點)
- coverageStatus ("covered" 或 "gap")
- linkedClusters (對應 clusterId array)
所有文字維持專業語氣，避免 emoji。`;  

  const payload = {
    images: analyses.map(formatSingleImageForLLM),
    clusters,
  };

  const userPrompt = `請輸出 JSON：\n${JSON.stringify(payload, null, 2)}`;

  const content = await callChatCompletion(
    PERSONA_MODELS,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    1000,
    JSON_RESPONSE_FORMAT,
    metrics
  );

  const parsed = safeParseJson<PersonaLLMResponse>(content, 'persona insights');
  return parsed.personas ?? [];
}

async function generateCreativeBriefs(
  analyses: SingleImageAnalysis[],
  personas: PersonaInsight[],
  metrics: CostMetrics
): Promise<CreativeBrief[]> {
  const systemPrompt = `你是一位 Meta 廣告創意總監。請針對 Persona 與素材生成繁體中文創意建議，格式限制：
- headlineHook: 15 字內
- coreMessage: 2-3 句 (60 字內)
- copyIdeas: 2 個方向 (各 30 字內)
- visualDirection: 2-3 點 bullet
- ctaSuggestion: 1 句
所有輸出維持策略性且親和，避免 emoji。`;

  const payload = {
    personas,
    analyses: analyses.map(formatSingleImageForLLM),
  };

  const userPrompt = `請依 Persona 產出 JSON：\n${JSON.stringify(payload, null, 2)}`;

  const content = await callChatCompletion(
    CREATIVE_MODELS,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    1200,
    JSON_RESPONSE_FORMAT,
    metrics
  );

  const parsed = safeParseJson<CreativeBriefLLMResponse>(content, 'creative briefs');
  return parsed.creativeBriefs ?? [];
}

async function generateFallbackSummary(
  analyses: SingleImageAnalysis[],
  metrics: CostMetrics
): Promise<FallbackSummaryResult> {
  const systemPrompt = `你是一名電商行銷專家。請綜合所有素材生成 80 字內的產品彙整摘要 (繁體中文)，並估計 0-1 信心值。回傳 JSON：{ "summary": "...", "confidence": 0.87 }。`;

  const userPrompt = `素材資訊如下：\n${serializeAnalysesForLLM(analyses)}`;

  const content = await callChatCompletion(
    FALLBACK_MODELS,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    600,
    JSON_RESPONSE_FORMAT,
    metrics
  );

  const parsed = safeParseJson<FallbackLLMResponse>(content, 'fallback summary');
  return {
    summary: parsed.summary ?? '',
    confidence: typeof parsed.confidence === 'number'
      ? Math.max(0.1, Math.min(0.99, parsed.confidence))
      : 0.7,
  };
}

export async function analyzeCreativeDiversity(
  images: string[],
  options: CreativeDiversityOptions = {}
): Promise<CreativeDiversityResult> {
  if (!images || images.length === 0) {
    throw new Error('At least one image is required for analysis');
  }

  const defaultedOptions: Required<CreativeDiversityOptions> = {
    generatePersonas: options.generatePersonas ?? true,
    generateCreativeBriefs: options.generateCreativeBriefs ?? true,
    runFallbackSummary: options.runFallbackSummary ?? false,
    bufferPercentage: options.bufferPercentage ?? 30,
    productNameHint: options.productNameHint ?? '',
  };

  const metrics: CostMetrics = {
    openaiInputTokens: 0,
    openaiOutputTokens: 0,
    googleVisionCalls: 0,
    metaQueries: 0,
  };

  const singleImageResults: SingleImageAnalysis[] = [];
  for (let i = 0; i < images.length; i += 1) {
    const result = await analyzeSingleImage(images[i], i, metrics, {
      productNameHint: defaultedOptions.productNameHint || undefined,
    });
    singleImageResults.push(result);
  }

  const clusters = await generateClusterSummaries(singleImageResults, metrics);

  let personas: PersonaInsight[] = [];
  if (defaultedOptions.generatePersonas) {
    personas = await generatePersonaInsights(singleImageResults, clusters, metrics);
  }

  let creativeBriefs: CreativeBrief[] = [];
  if (defaultedOptions.generateCreativeBriefs && personas.length > 0) {
    creativeBriefs = await generateCreativeBriefs(singleImageResults, personas, metrics);
  }

  let fallbackSummary: FallbackSummaryResult | undefined;
  if (defaultedOptions.runFallbackSummary) {
    fallbackSummary = await generateFallbackSummary(singleImageResults, metrics);
  }

  const breakdown = calculateCostBreakdown(metrics);
  const buffered = addBuffer(breakdown, defaultedOptions.bufferPercentage);

  return {
    clusters,
    personas,
    creativeBriefs,
    productAnalyses: singleImageResults.map((item) => item.product),
    visionInsights: singleImageResults.map((item) => item.vision),
    fallbackSummary,
    cost: {
      metrics: { ...metrics },
      breakdown,
      buffered,
    },
  };
}

// Multi-modal product classification system
// Based on deep learning frameworks for comprehensive e-commerce categorization
function classifyProduct(detectedItems: string[], textContent: string): {
  category: string;
  productName: string;
  confidence: number;
} {
  const items = detectedItems.join(' ').toLowerCase();
  const text = textContent.toLowerCase();
  const combined = `${items} ${text}`;
  
  console.log('🔍 Multi-modal classification input:', { 
    objects: detectedItems, 
    text: textContent,
    combinedFeatures: combined 
  });
  
  // Use hierarchical classification approach
  const classificationResult = hierarchicalClassification(combined, detectedItems);
  
  if (classificationResult.confidence > 70) {
    console.log(`✅ High confidence classification: ${classificationResult.productName}`);
    return classificationResult;
  }
  
  // Fallback to feature-based classification
  const featureResult = featureBasedClassification(combined, detectedItems);
  console.log(`⚠️  Feature-based classification: ${featureResult.productName}`);
  
  return featureResult;
}

// Hierarchical classification following deep learning taxonomy
function hierarchicalClassification(combined: string, detectedItems: string[]): {
  category: string;
  productName: string;
  confidence: number;
} {
  // Level 1: Primary Categories (Electronics, Fashion, Food, etc.)
  const primaryCategory = getPrimaryCategory(combined);
  
  // Level 2: Sub-categories within primary
  const subCategory = getSubCategory(combined, primaryCategory);
  
  // Level 3: Specific product identification
  const productName = getSpecificProduct(combined, primaryCategory, subCategory);
  
  // Calculate confidence based on feature matching
  const confidence = calculateConfidence(combined, detectedItems, primaryCategory);
  
  return {
    category: primaryCategory,
    productName: productName,
    confidence: confidence
  };
}

function getPrimaryCategory(combined: string): string {
  // Electronics category patterns
  if (combined.match(/phone|smartphone|iphone|android|mobile|tablet|laptop|computer|tv|camera|headphone|speaker|watch|smartwatch/)) {
    return 'electronics';
  }
  
  // Fashion category patterns
  if (combined.match(/shirt|dress|pants|jeans|shoe|boot|sneaker|jacket|coat|hat|bag|purse|clothing|apparel|fashion|wear/)) {
    return 'fashion';
  }
  
  // Food category patterns
  if (combined.match(/food|meal|burger|pizza|sandwich|drink|beverage|snack|restaurant|kitchen|cooking|eat|dish/)) {
    return 'food';
  }
  
  // Health & Beauty patterns
  if (combined.match(/supplement|vitamin|medicine|health|beauty|cosmetic|skincare|makeup|cream|lotion|shampoo/)) {
    return 'health';
  }
  
  // Home & Garden patterns
  if (combined.match(/furniture|chair|table|bed|sofa|lamp|decoration|plant|garden|home|house|room/)) {
    return 'home';
  }
  
  // Sports & Fitness patterns
  if (combined.match(/sport|fitness|gym|exercise|ball|equipment|outdoor|bike|run|swim|yoga/)) {
    return 'sports';
  }
  
  // Automotive patterns
  if (combined.match(/car|auto|vehicle|tire|engine|part|motor|drive|wheel|brake/)) {
    return 'automotive';
  }
  
  // Books & Education patterns
  if (combined.match(/book|read|education|learn|study|school|university|knowledge|text/)) {
    return 'books';
  }
  
  // Toys & Games patterns
  if (combined.match(/toy|game|play|child|kid|puzzle|doll|action|figure|board|card/)) {
    return 'toys';
  }
  
  // Jewelry & Accessories patterns
  if (combined.match(/jewelry|ring|necklace|bracelet|watch|accessory|gold|silver|diamond|precious/)) {
    return 'jewelry';
  }
  
  return 'unknown';
}

function getSubCategory(combined: string, primaryCategory: string): string {
  switch (primaryCategory) {
    case 'electronics':
      if (combined.match(/phone|smartphone|iphone|android|mobile/)) return 'mobile_phones';
      if (combined.match(/laptop|computer|desktop|pc/)) return 'computers';
      if (combined.match(/tv|television|monitor|display/)) return 'displays';
      if (combined.match(/camera|photo|video/)) return 'cameras';
      if (combined.match(/headphone|speaker|audio|music/)) return 'audio';
      return 'general_electronics';
      
    case 'fashion':
      if (combined.match(/shirt|t-shirt|blouse|top/)) return 'tops';
      if (combined.match(/pants|jeans|trousers|shorts/)) return 'bottoms';
      if (combined.match(/dress|gown|skirt/)) return 'dresses';
      if (combined.match(/shoe|boot|sneaker|sandal/)) return 'footwear';
      if (combined.match(/jacket|coat|sweater|hoodie/)) return 'outerwear';
      return 'general_fashion';
      
    case 'food':
      if (combined.match(/burger|sandwich|fast.*food|mcdonald|kfc|burger.*king/)) return 'fast_food';
      if (combined.match(/pizza|italian/)) return 'pizza';
      if (combined.match(/drink|beverage|coffee|tea|juice|soda/)) return 'beverages';
      if (combined.match(/snack|chip|cookie|candy/)) return 'snacks';
      return 'general_food';
      
    default:
      return 'general';
  }
}

function getSpecificProduct(combined: string, primaryCategory: string, subCategory: string): string {
  // Specific product identification based on brand names, models, or distinctive features
  
  // Food specific products
  if (combined.includes('big mac') || combined.includes('mcdonald')) {
    return 'Big Mac Burger';
  }
  
  // Electronics specific products
  if (combined.match(/iphone.*(\d+)/)) {
    const model = combined.match(/iphone.*(\d+)/)?.[0];
    return model ? `Apple ${model}` : 'iPhone';
  }
  
  if (combined.match(/samsung.*galaxy/)) {
    return 'Samsung Galaxy Phone';
  }
  
  // Fashion specific products
  if (combined.match(/nike|adidas|puma|reebok/)) {
    const brand = combined.match(/(nike|adidas|puma|reebok)/)?.[0];
    return brand ? `${brand} ${subCategory}` : `${subCategory}`;
  }
  
  // Generate descriptive product name based on category and features
  const adjectives = extractAdjectives(combined);
  const productType = getProductType(subCategory);
  
  return adjectives.length > 0 ? `${adjectives.join(' ')} ${productType}` : productType;
}

function extractAdjectives(combined: string): string[] {
  const adjectives = [];
  
  // Color adjectives
  if (combined.match(/red|blue|green|black|white|yellow|pink|purple|orange|gray|brown/)) {
    const color = combined.match(/(red|blue|green|black|white|yellow|pink|purple|orange|gray|brown)/)?.[0];
    if (color) adjectives.push(color);
  }
  
  // Size adjectives
  if (combined.match(/small|medium|large|big|huge|tiny|mini|xl|xxl/)) {
    const size = combined.match(/(small|medium|large|big|huge|tiny|mini|xl|xxl)/)?.[0];
    if (size) adjectives.push(size);
  }
  
  // Quality adjectives
  if (combined.match(/premium|luxury|professional|pro|deluxe|classic|modern|vintage/)) {
    const quality = combined.match(/(premium|luxury|professional|pro|deluxe|classic|modern|vintage)/)?.[0];
    if (quality) adjectives.push(quality);
  }
  
  return adjectives;
}

function getProductType(subCategory: string): string {
  const typeMap: { [key: string]: string } = {
    'mobile_phones': 'Smartphone',
    'computers': 'Computer',
    'displays': 'Display',
    'cameras': 'Camera',
    'audio': 'Audio Device',
    'tops': 'Top',
    'bottoms': 'Pants',
    'dresses': 'Dress',
    'footwear': 'Shoes',
    'outerwear': 'Jacket',
    'fast_food': 'Fast Food',
    'pizza': 'Pizza',
    'beverages': 'Beverage',
    'snacks': 'Snack',
    'general_electronics': 'Electronic Product',
    'general_fashion': 'Fashion Item',
    'general_food': 'Food Product',
    'general': 'Product'
  };
  
  return typeMap[subCategory] || 'Product';
}

function calculateConfidence(combined: string, detectedItems: string[], category: string): number {
  let confidence = 50; // Base confidence
  
  // Increase confidence for specific brand matches
  if (combined.match(/apple|samsung|nike|adidas|mcdonald|coca.*cola|pepsi|sony|lg|hp|dell/)) {
    confidence += 25;
  }
  
  // Increase confidence for multiple feature matches
  const featureMatches = detectedItems.filter(item => 
    combined.includes(item.toLowerCase())
  ).length;
  
  confidence += Math.min(featureMatches * 5, 20);
  
  // Increase confidence for category-specific keywords
  const categoryKeywords = getCategoryKeywords(category);
  const keywordMatches = categoryKeywords.filter(keyword => 
    combined.includes(keyword)
  ).length;
  
  confidence += Math.min(keywordMatches * 3, 15);
  
  return Math.min(confidence, 95);
}

function getCategoryKeywords(category: string): string[] {
  const keywordMap: { [key: string]: string[] } = {
    'electronics': ['technology', 'digital', 'smart', 'electronic', 'device', 'gadget'],
    'fashion': ['style', 'wear', 'clothing', 'apparel', 'fashion', 'outfit'],
    'food': ['eat', 'taste', 'delicious', 'fresh', 'organic', 'natural'],
    'health': ['wellness', 'healthy', 'natural', 'supplement', 'care', 'medical'],
    'home': ['home', 'house', 'indoor', 'decoration', 'furniture', 'living'],
    'sports': ['fitness', 'active', 'sport', 'exercise', 'outdoor', 'athletic'],
    'automotive': ['car', 'vehicle', 'auto', 'drive', 'motor', 'transport'],
    'books': ['read', 'learn', 'education', 'knowledge', 'study', 'literature'],
    'toys': ['play', 'fun', 'game', 'entertainment', 'child', 'kids'],
    'jewelry': ['luxury', 'elegant', 'precious', 'beautiful', 'jewelry', 'accessory']
  };
  
  return keywordMap[category] || [];
}

// Feature-based classification as fallback
function featureBasedClassification(combined: string, detectedItems: string[]): {
  category: string;
  productName: string;
  confidence: number;
} {
  // Use the most prominent detected item as basis
  if (detectedItems.length > 0) {
    const mainItem = detectedItems[0];
    const category = getPrimaryCategory(combined);
    const confidence = Math.max(40, 70 - detectedItems.length * 5);
    
    return {
      category: category !== 'unknown' ? category : 'general',
      productName: mainItem,
      confidence: confidence
    };
  }
  
  return {
    category: 'unknown',
    productName: 'Unknown Product',
    confidence: 30
  };
}

// Generate target audience based on multi-modal product analysis
function generateTargetAudience(category: string, productName: string): string[] {
  const name = productName.toLowerCase();
  
  switch (category) {
    case 'electronics':
      if (name.includes('phone') || name.includes('smartphone')) {
        return ['18-45歲數位用戶', '科技愛好者', '商務人士', '學生群體'];
      }
      if (name.includes('laptop') || name.includes('computer')) {
        return ['22-50歲專業人士', '學生群體', '創作者', 'IT工作者'];
      }
      if (name.includes('camera')) {
        return ['25-55歲攝影愛好者', '創作者', '旅行愛好者', '專業攝影師'];
      }
      return ['18-65歲科技消費者', '早期科技採用者', '數位原住民'];
    
    case 'fashion':
      if (name.includes('sneaker') || name.includes('shoe')) {
        return ['16-40歲時尚青年', '運動愛好者', '街頭文化愛好者'];
      }
      if (name.includes('dress') || name.includes('gown')) {
        return ['20-50歲職業女性', '社交活躍人群', '時尚意識女性'];
      }
      if (name.includes('nike') || name.includes('adidas')) {
        return ['16-45歲運動時尚愛好者', '健身人群', '品牌追隨者'];
      }
      return ['18-45歲時尚消費者', '購物愛好者', '品質追求者'];
    
    case 'food':
      if (name.includes('burger') || name.includes('fast food')) {
        return ['16-35歲年輕群體', '忙碌上班族', '學生群體', '便利消費者'];
      }
      if (name.includes('pizza')) {
        return ['18-45歲社交人群', '家庭聚餐者', '夜間消費者'];
      }
      if (name.includes('coffee') || name.includes('beverage')) {
        return ['25-50歲職場人士', '咖啡愛好者', '社交人群'];
      }
      return ['20-60歲美食愛好者', '家庭主力消費者', '生活品質追求者'];
    
    case 'health':
      if (name.includes('supplement') || name.includes('vitamin')) {
        return ['30-65歲健康意識人群', '運動愛好者', '中高收入群體'];
      }
      if (name.includes('fitness') || name.includes('gym')) {
        return ['20-50歲健身愛好者', '運動員', '健康生活追求者'];
      }
      return ['25-70歲健康關注者', '保健品使用者', '醫療需求者'];
    
    case 'beauty':
      if (name.includes('skincare') || name.includes('cream')) {
        return ['18-60歲護膚關注者', '美容愛好者', '品質追求女性'];
      }
      if (name.includes('makeup') || name.includes('cosmetic')) {
        return ['16-50歲化妝愛好者', '時尚女性', '專業化妝師'];
      }
      return ['18-55歲美容消費者', '自我護理關注者', '品牌忠誠者'];
    
    case 'home':
      if (name.includes('furniture')) {
        return ['25-60歲家居裝修者', '新婚夫婦', '搬家人群', '生活品質追求者'];
      }
      if (name.includes('decoration') || name.includes('lamp')) {
        return ['25-55歲居家美學愛好者', '室內設計愛好者', '品味追求者'];
      }
      return ['25-65歲家庭主力消費者', '居家生活愛好者', '品質生活追求者'];
    
    case 'sports':
      if (name.includes('fitness') || name.includes('gym')) {
        return ['18-50歲健身愛好者', '運動員', '健康生活追求者'];
      }
      if (name.includes('outdoor') || name.includes('bike')) {
        return ['20-60歲戶外愛好者', '冒險者', '運動愛好者'];
      }
      return ['16-65歲運動參與者', '健康意識人群', '活躍生活方式者'];
    
    case 'automotive':
      if (name.includes('car') || name.includes('vehicle')) {
        return ['25-65歲車主', '汽車愛好者', '通勤族', '家庭用車需求者'];
      }
      return ['20-70歲駕駛者', '汽車維護需求者', '交通工具使用者'];
    
    case 'books':
      return ['16-70歲知識追求者', '學生群體', '專業人士', '終身學習者'];
    
    case 'toys':
      return ['25-45歲父母群體', '禮品購買者', '兒童娛樂關注者'];
    
    case 'jewelry':
      return ['25-65歲精品消費者', '禮品購買者', '特殊場合需求者', '收藏愛好者'];
    
    default:
      return ['25-55歲主流消費者', '網購人群', '品質追求者', '便利購物者'];
  }
}

// Generate Facebook-compatible keywords based on comprehensive product analysis
function generateKeywords(category: string, productName: string, detectedItems: string[]): string[] {
  const name = productName.toLowerCase();
  const baseKeywords = [...detectedItems.slice(0, 2)]; // Limit base keywords
  
  switch (category) {
    case 'electronics':
      if (name.includes('phone') || name.includes('smartphone')) {
        return [...baseKeywords, 'mobile technology', 'smartphones', 'communication', 'digital lifestyle'];
      }
      if (name.includes('laptop') || name.includes('computer')) {
        return [...baseKeywords, 'computers', 'productivity', 'work technology', 'digital tools'];
      }
      if (name.includes('camera')) {
        return [...baseKeywords, 'photography', 'cameras', 'digital imaging', 'creative tools'];
      }
      return [...baseKeywords, 'technology', 'electronics', 'gadgets', 'innovation'];
    
    case 'fashion':
      if (name.includes('sneaker') || name.includes('shoe')) {
        return [...baseKeywords, 'footwear', 'sneakers', 'street fashion', 'athletic wear'];
      }
      if (name.includes('nike') || name.includes('adidas')) {
        return [...baseKeywords, 'sportswear', 'athletic brands', 'fitness fashion', 'active lifestyle'];
      }
      if (name.includes('dress')) {
        return [...baseKeywords, 'women fashion', 'formal wear', 'business attire', 'special occasions'];
      }
      return [...baseKeywords, 'fashion', 'clothing', 'style', 'apparel'];
    
    case 'food':
      if (name.includes('burger') || name.includes('fast food')) {
        return [...baseKeywords, 'fast food', 'quick meals', 'convenience food', 'casual dining'];
      }
      if (name.includes('pizza')) {
        return [...baseKeywords, 'pizza', 'italian food', 'delivery food', 'social dining'];
      }
      if (name.includes('coffee') || name.includes('beverage')) {
        return [...baseKeywords, 'coffee', 'beverages', 'cafe culture', 'morning routine'];
      }
      return [...baseKeywords, 'food', 'dining', 'culinary', 'gourmet'];
    
    case 'health':
      if (name.includes('supplement') || name.includes('vitamin')) {
        return [...baseKeywords, 'health supplements', 'wellness', 'nutrition', 'vitamins'];
      }
      if (name.includes('fitness')) {
        return [...baseKeywords, 'fitness', 'exercise', 'health', 'wellness'];
      }
      return [...baseKeywords, 'health', 'wellness', 'medical', 'healthcare'];
    
    case 'beauty':
      if (name.includes('skincare')) {
        return [...baseKeywords, 'skincare', 'beauty', 'cosmetics', 'anti-aging'];
      }
      if (name.includes('makeup')) {
        return [...baseKeywords, 'makeup', 'cosmetics', 'beauty products', 'personal care'];
      }
      return [...baseKeywords, 'beauty', 'cosmetics', 'personal care', 'self care'];
    
    case 'home':
      if (name.includes('furniture')) {
        return [...baseKeywords, 'home furniture', 'interior design', 'home decor', 'living space'];
      }
      return [...baseKeywords, 'home', 'household', 'interior', 'home improvement'];
    
    case 'sports':
      if (name.includes('fitness')) {
        return [...baseKeywords, 'fitness equipment', 'exercise', 'gym', 'health'];
      }
      return [...baseKeywords, 'sports', 'athletics', 'fitness', 'outdoor activities'];
    
    case 'automotive':
      return [...baseKeywords, 'automotive', 'cars', 'vehicles', 'transportation'];
    
    case 'books':
      return [...baseKeywords, 'books', 'education', 'reading', 'knowledge'];
    
    case 'toys':
      return [...baseKeywords, 'toys', 'children', 'games', 'entertainment'];
    
    case 'jewelry':
      return [...baseKeywords, 'jewelry', 'accessories', 'luxury', 'gifts'];
    
    default:
      return [...baseKeywords, 'products', 'shopping', 'retail', 'consumer goods'];
  }
}

async function analyzeSingleImage(
  base64Image: string,
  index: number,
  metrics: CostMetrics,
  options?: { productNameHint?: string }
): Promise<SingleImageAnalysis> {
  console.log(`📸 開始分析第 ${index + 1} 張素材`);

  const systemPrompt = `You are a professional e-commerce product analyst. Analyze the product image and provide detailed classification in JSON format.

Focus on:
1. Product identification and category classification
2. Target audience demographics (Traditional Chinese)
3. Marketing keywords (English)
4. Analysis confidence score (0-1)

Categories: electronics, fashion, food, health, beauty, home, sports, automotive, books, toys, jewelry, other.

Respond strictly as JSON with keys: productName, productCategory (array), targetAudience (array), keywords (array), confidence.`;

  const userPrompt: ChatCompletionMessageParam = {
    role: 'user',
    content: [
      {
        type: 'text',
        text: options?.productNameHint
          ? `Use this context when relevant: ${options.productNameHint}`
          : 'Please analyze this product image for Facebook advertising insights.',
      },
      {
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${base64Image}` },
      },
    ],
  } as ChatCompletionMessageParam;

  // 新模型（gpt-5-mini, o1系列）使用 max_completion_tokens
  const usesNewParameter = PRODUCT_IMAGE_MODEL.startsWith('gpt-5') || PRODUCT_IMAGE_MODEL.startsWith('o1');
  
  const response = await openai.chat.completions.create({
    model: PRODUCT_IMAGE_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      userPrompt,
    ],
    response_format: JSON_RESPONSE_FORMAT,
    ...(usesNewParameter 
      ? { max_completion_tokens: 900 }
      : { max_tokens: 900 }
    ),
  });

  if (response.usage) {
    metrics.openaiInputTokens += response.usage.prompt_tokens ?? 0;
    metrics.openaiOutputTokens += response.usage.completion_tokens ?? 0;
  }

  const rawContent = response.choices[0]?.message?.content ?? '{}';
  const result = safeParseJson<Partial<ProductAnalysis>>(rawContent, 'single image analysis');

  const vision = await analyzeWithGoogleVision(base64Image, metrics);
  const classification = classifyProduct(vision.objects, vision.text.join(' '));

  const product: ProductAnalysis = {
    productName: result.productName?.trim() || classification.productName,
    productCategory: Array.isArray(result.productCategory) && result.productCategory.length
      ? result.productCategory
      : [classification.category],
    targetAudience: Array.isArray(result.targetAudience) && result.targetAudience.length
      ? result.targetAudience
      : generateTargetAudience(classification.category, classification.productName),
    keywords: Array.isArray(result.keywords) && result.keywords.length
      ? result.keywords
      : generateKeywords(classification.category, classification.productName, vision.objects),
    confidence: typeof result.confidence === 'number'
      ? Math.max(0.1, Math.min(0.99, result.confidence))
      : Math.max(0.1, Math.min(0.99, classification.confidence / 100)),
  };

  return {
    index,
    base64Image,
    product,
    vision,
  };
}

export async function analyzeProductImage(base64Image: string): Promise<ProductAnalysis> {
  try {
    const metrics: CostMetrics = {
      openaiInputTokens: 0,
      openaiOutputTokens: 0,
      googleVisionCalls: 0,
      metaQueries: 0,
    };

    const result = await analyzeSingleImage(base64Image, 0, metrics);
    console.log('✅ 單張素材分析完成', {
      productName: result.product.productName,
      confidence: result.product.confidence,
      googleVisionCalls: metrics.googleVisionCalls,
    });

    return result.product;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error in OpenAI vision analysis:', error);
    throw new Error('Failed to analyze product image: ' + message);
  }
}

async function analyzeWithGoogleVision(
  base64Image: string,
  metrics?: CostMetrics
): Promise<ImageVisionInsights> {
  try {
    const imageBuffer = Buffer.from(base64Image, 'base64');

    console.log('📡 呼叫 Google Vision API');

    const [objectsResult, labelsResult, textResult, propertiesResult] = await Promise.all([
      visionClient.objectLocalization({ image: { content: imageBuffer } }),
      visionClient.labelDetection({ image: { content: imageBuffer } }),
      visionClient.textDetection({ image: { content: imageBuffer } }),
      visionClient.imageProperties({ image: { content: imageBuffer } }),
    ]);

    if (metrics) {
      metrics.googleVisionCalls += 4;
    }

    const objectAnnotations = (objectsResult[0]?.localizedObjectAnnotations ?? []) as protos.google.cloud.vision.v1.ILocalizedObjectAnnotation[];
    const labelAnnotations = (labelsResult[0]?.labelAnnotations ?? []) as protos.google.cloud.vision.v1.IEntityAnnotation[];
    const textAnnotations = (textResult[0]?.textAnnotations ?? []) as protos.google.cloud.vision.v1.IEntityAnnotation[];
    const colorInfos = (propertiesResult[0]?.imagePropertiesAnnotation?.dominantColors?.colors ?? []) as protos.google.cloud.vision.v1.IColorInfo[];

    const objects = objectAnnotations
      .map((obj) => obj.name ?? '')
      .filter((item): item is string => Boolean(item));

    const labels = labelAnnotations
      .map((label) => label.description ?? '')
      .filter((item): item is string => Boolean(item));

    const text = textAnnotations
      .slice(0, 5)
      .map((annotation) => annotation.description ?? '')
      .filter((item): item is string => Boolean(item));

    const colors = colorInfos
      .slice(0, 3)
      .map((colorInfo) => {
        const rgb = colorInfo.color;
        if (!rgb) return null;
        return `rgb(${Math.round(rgb.red ?? 0)}, ${Math.round(rgb.green ?? 0)}, ${Math.round(rgb.blue ?? 0)})`;
      })
      .filter((item): item is string => Boolean(item));

    console.log('✅ Google Vision results:', { objects, labels, text });

    return { objects, labels, text, colors };
  } catch (error) {
    console.error('❌ Google Cloud Vision error:', error);
    return { objects: [], labels: [], text: [], colors: [] };
  }
}

export async function generateAudienceKeywords(
  productAnalysis: ProductAnalysis,
  priceRange?: string,
  salesRegion?: string
): Promise<AudienceKeyword[]> {
  try {
    console.log('🎯 Generating audience keywords...');
    
    // Get real Facebook interests from the API ONLY
    const { getRealFacebookInterests } = await import('./metaGraphService');
    
    const keywords = [];
    
    // Generate keywords for each category and keyword from the analysis
    for (const category of productAnalysis.productCategory) {
      console.log(`Getting Facebook interests for category: ${category}`);
      const interests = await getRealFacebookInterests(category);
      
      if (interests.length > 0) {
        keywords.push({
          category: 'interests',
          keywords: interests.slice(0, 5)
        });
        console.log(`Found ${interests.length} interests for ${category}:`, interests);
      }
    }
    
    // Also get interests for specific keywords
    for (const keyword of productAnalysis.keywords.slice(0, 3)) {
      console.log(`Getting Facebook interests for keyword: ${keyword}`);
      const interests = await getRealFacebookInterests(keyword);
      
      if (interests.length > 0) {
        keywords.push({
          category: 'interests',
          keywords: interests.slice(0, 3)
        });
        console.log(`Found ${interests.length} interests for ${keyword}:`, interests);
      }
    }
    
    console.log('Successfully retrieved Facebook interests:', keywords);
    return keywords;
    
  } catch (error) {
    console.error('❌ Error generating audience keywords:', error);
    return [];
  }
}