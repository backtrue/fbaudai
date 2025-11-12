/**
 * Cost Calculator Utility
 * Converts API usage metrics to USD, JPY, and estimated credits
 * 
 * Pricing assumptions (as of 2025.11):
 * - OpenAI GPT-4o Vision: $5 / 1M input tokens, $15 / 1M output tokens
 * - Google Vision APIs: $1.5-$2 / 1,000 calls per API type
 * - Exchange rate: 1 USD = 150 JPY
 * - Credit value: 1 credit = 10 JPY
 */

export interface CostMetrics {
  openaiInputTokens: number;
  openaiOutputTokens: number;
  googleVisionCalls: number; // Total API calls (object, label, text, properties)
  metaQueries: number; // Number of Meta Graph API queries
}

export interface CostBreakdown {
  openaiCostUsd: number;
  googleVisionCostUsd: number;
  totalCostUsd: number;
  totalCostJpy: number;
  estimatedCredits: number;
}

// Pricing constants
const OPENAI_INPUT_PRICE_PER_1M_TOKENS = 5; // USD
const OPENAI_OUTPUT_PRICE_PER_1M_TOKENS = 15; // USD
const GOOGLE_VISION_PRICE_PER_1000_CALLS = 1.75; // USD (average of $1.5-$2)
const USD_TO_JPY_RATE = 150;
const JPY_PER_CREDIT = 10;

/**
 * Calculate OpenAI Vision API cost
 */
export function calculateOpenAICost(
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = (inputTokens / 1_000_000) * OPENAI_INPUT_PRICE_PER_1M_TOKENS;
  const outputCost = (outputTokens / 1_000_000) * OPENAI_OUTPUT_PRICE_PER_1M_TOKENS;
  return inputCost + outputCost;
}

/**
 * Calculate Google Vision API cost
 * Each image analysis involves 4 API calls (object, label, text, properties)
 */
export function calculateGoogleVisionCost(totalApiCalls: number): number {
  return (totalApiCalls / 1000) * GOOGLE_VISION_PRICE_PER_1000_CALLS;
}

/**
 * Convert USD to JPY
 */
export function convertUsdToJpy(usd: number): number {
  return Math.round(usd * USD_TO_JPY_RATE * 100) / 100;
}

/**
 * Convert JPY to credits
 */
export function convertJpyToCredits(jpy: number): number {
  return Math.round((jpy / JPY_PER_CREDIT) * 100) / 100;
}

/**
 * Calculate complete cost breakdown
 */
export function calculateCostBreakdown(metrics: CostMetrics): CostBreakdown {
  const openaiCostUsd = calculateOpenAICost(
    metrics.openaiInputTokens,
    metrics.openaiOutputTokens
  );
  
  const googleVisionCostUsd = calculateGoogleVisionCost(metrics.googleVisionCalls);
  
  const totalCostUsd = openaiCostUsd + googleVisionCostUsd;
  const totalCostJpy = convertUsdToJpy(totalCostUsd);
  const estimatedCredits = convertJpyToCredits(totalCostJpy);

  return {
    openaiCostUsd: Math.round(openaiCostUsd * 10000) / 10000,
    googleVisionCostUsd: Math.round(googleVisionCostUsd * 10000) / 10000,
    totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
    totalCostJpy,
    estimatedCredits,
  };
}

/**
 * Estimate cost for a single image analysis
 * Assumes: ~1,500 input tokens + ~250 output tokens per image + 4 Google Vision API calls
 */
export function estimateSingleImageCost(): CostBreakdown {
  return calculateCostBreakdown({
    openaiInputTokens: 1500,
    openaiOutputTokens: 250,
    googleVisionCalls: 4,
    metaQueries: 0,
  });
}

/**
 * Estimate cost for multi-image analysis (Free task - AI 任務 1)
 * Assumes: 10 images + clustering analysis
 */
export function estimateFreeTaskCost(imageCount: number = 10): CostBreakdown {
  // Per-image cost
  const perImageInputTokens = 1500;
  const perImageOutputTokens = 250;
  const perImageGoogleCalls = 4;

  // Clustering analysis (additional LLM call)
  const clusteringInputTokens = 2000;
  const clusteringOutputTokens = 500;

  const totalMetrics: CostMetrics = {
    openaiInputTokens:
      imageCount * perImageInputTokens + clusteringInputTokens,
    openaiOutputTokens:
      imageCount * perImageOutputTokens + clusteringOutputTokens,
    googleVisionCalls: imageCount * perImageGoogleCalls,
    metaQueries: 0,
  };

  return calculateCostBreakdown(totalMetrics);
}

/**
 * Estimate cost for Pro task (AI 任務 1+2+3)
 * Assumes: Free task + Persona analysis + Creative suggestions
 */
export function estimateProTaskCost(imageCount: number = 10): CostBreakdown {
  // Free task cost
  const freeTaskMetrics = estimateFreeTaskCost(imageCount);

  // Additional Pro tasks (Persona + Creative)
  const personaInputTokens = 1500;
  const personaOutputTokens = 800;

  const creativeInputTokens = 2000;
  const creativeOutputTokens = 1200;

  const additionalMetrics: CostMetrics = {
    openaiInputTokens: personaInputTokens + creativeInputTokens,
    openaiOutputTokens: personaOutputTokens + creativeOutputTokens,
    googleVisionCalls: 0,
    metaQueries: 5, // Approximate Meta Graph API queries
  };

  const additionalCost = calculateCostBreakdown(additionalMetrics);

  // Combine costs
  return {
    openaiCostUsd:
      freeTaskMetrics.openaiCostUsd + additionalCost.openaiCostUsd,
    googleVisionCostUsd: freeTaskMetrics.googleVisionCostUsd,
    totalCostUsd:
      freeTaskMetrics.totalCostUsd + additionalCost.totalCostUsd,
    totalCostJpy:
      freeTaskMetrics.totalCostJpy + additionalCost.totalCostJpy,
    estimatedCredits:
      freeTaskMetrics.estimatedCredits + additionalCost.estimatedCredits,
  };
}

/**
 * Estimate cost for Fallback C (complete product analysis)
 * High-cost operation: analyzes all images to generate unified product summary
 */
export function estimateFallbackCCost(imageCount: number = 10): CostBreakdown {
  // Comprehensive analysis of all images
  const comprehensiveInputTokens = 3000 + imageCount * 500;
  const comprehensiveOutputTokens = 1500;

  const metrics: CostMetrics = {
    openaiInputTokens: comprehensiveInputTokens,
    openaiOutputTokens: comprehensiveOutputTokens,
    googleVisionCalls: 0,
    metaQueries: 0,
  };

  return calculateCostBreakdown(metrics);
}

/**
 * Add buffer to cost for safety margin
 */
export function addBuffer(
  cost: CostBreakdown,
  bufferPercentage: number = 30
): CostBreakdown {
  const multiplier = 1 + bufferPercentage / 100;

  return {
    openaiCostUsd: Math.round(cost.openaiCostUsd * multiplier * 10000) / 10000,
    googleVisionCostUsd: Math.round(cost.googleVisionCostUsd * multiplier * 10000) / 10000,
    totalCostUsd: Math.round(cost.totalCostUsd * multiplier * 10000) / 10000,
    totalCostJpy: Math.round(cost.totalCostJpy * multiplier * 100) / 100,
    estimatedCredits: Math.round(cost.estimatedCredits * multiplier * 100) / 100,
  };
}
