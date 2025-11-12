// Facebook Graph API Integration - Based on Official Documentation
// https://developers.facebook.com/docs/marketing-api/audiences/reference/targeting-search/

import { facebookTokenManager } from './facebookTokenManager';

export interface FacebookAudienceData {
  id: string;
  name: string;
  type: string;
  audience_size_lower_bound?: number;
  audience_size_upper_bound?: number;
  path?: string[];
  topic?: string;
  description?: string;
}

export interface AudienceRecommendation {
  audienceType: string;
  audienceName: string;
  audienceId?: string;
  audienceSize?: number;
  usageNote: string;
  isVerified: boolean;
}

// Facebook Targeting Search API - Official Implementation
export async function searchFacebookAudience(
  keyword: string,
  type: 'interests' | 'behaviors' | 'demographics' = 'interests'
): Promise<FacebookAudienceData[]> {
  console.log(`🔍 Facebook API Search: "${keyword}" (${type})`);
  
  try {
    // Get valid token from token manager
    const accessToken = await facebookTokenManager.getValidToken();
    
    if (!accessToken) {
      console.error("❌ Facebook access token not available");
      return [];
    }

    // Official Facebook Targeting Search API endpoint
    const apiUrl = `https://graph.facebook.com/v19.0/search`;
    const params = new URLSearchParams({
      type: 'adinterest',
      q: keyword,
      limit: '25',
      access_token: accessToken,
    });

    console.log(`📡 API Call: ${apiUrl}?${params.toString().replace(accessToken, 'TOKEN')}`);
    
    const response = await fetch(`${apiUrl}?${params}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Facebook API Error (${response.status}): ${errorText}`);
      return [];
    }

    const data = await response.json();
    console.log(`✅ Facebook API Response: ${data.data?.length || 0} results`);
    
    if (!data.data || data.data.length === 0) {
      console.log(`⚠️  No interests found for: ${keyword}`);
      return [];
    }

    // Map the response to our interface
    return data.data.map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.type || 'interest',
      audience_size_lower_bound: item.audience_size_lower_bound,
      audience_size_upper_bound: item.audience_size_upper_bound,
      path: item.path || [],
      topic: item.topic,
      description: item.description,
    }));

  } catch (error) {
    console.error('❌ Error searching Facebook audience:', error);
    return [];
  }
}

// Get real Facebook interests using official API
export async function getRealFacebookInterests(category: string): Promise<string[]> {
  try {
    // Get valid token from token manager
    const accessToken = await facebookTokenManager.getValidToken();
    
    if (!accessToken) {
      console.error("❌ Facebook access token not available");
      return [];
    }

    const apiUrl = `https://graph.facebook.com/v19.0/search`;
    const params = new URLSearchParams({
      type: 'adinterest',
      q: category,
      limit: '10',
      access_token: accessToken,
    });

    console.log(`🔍 Getting real Facebook interests for: ${category}`);
    const response = await fetch(`${apiUrl}?${params}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Facebook API Error (${response.status}): ${errorText}`);
      return [];
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      console.log(`⚠️  No interests found for category: ${category}`);
      return [];
    }

    // Extract interest names
    const interests = data.data.map((item: any) => item.name);
    console.log(`✅ Found ${interests.length} interests for ${category}`);
    
    return interests;

  } catch (error) {
    console.error(`❌ Error getting Facebook interests for ${category}:`, error);
    return [];
  }
}

// Verify and generate audience recommendations using real Facebook API
export async function verifyAndGenerateAudiences(
  productAnalysis: {
    productName: string;
    productCategory: string[];
    targetAudience: string[];
    keywords: string[];
  },
  analysisId: number
): Promise<AudienceRecommendation[]> {
  console.log('🎯 Starting Facebook audience verification...');
  
  try {
    // Test token availability
    const tokenStatus = facebookTokenManager.getTokenStatus();
    if (!tokenStatus.isValid) {
      throw new Error('Facebook API token is not available or has expired');
    }

    const allKeywords = [
      ...(Array.isArray(productAnalysis.productCategory) ? productAnalysis.productCategory : [productAnalysis.productCategory]),
      ...(Array.isArray(productAnalysis.targetAudience) ? productAnalysis.targetAudience : []),
      ...(Array.isArray(productAnalysis.keywords) ? productAnalysis.keywords : []),
    ].filter(Boolean);

    const recommendations: AudienceRecommendation[] = [];

    // Process each keyword with Facebook API
    for (const keyword of allKeywords) {
      console.log(`🔍 Processing keyword: ${keyword}`);
      
      const facebookAudiences = await searchFacebookAudience(keyword, 'interests');
      
      if (facebookAudiences.length > 0) {
        // Add top 3 verified audiences for this keyword
        const topAudiences = facebookAudiences.slice(0, 3);
        
        for (const audience of topAudiences) {
          const audienceSize = audience.audience_size_lower_bound || 0;
          
          recommendations.push({
            audienceType: 'Facebook興趣標籤',
            audienceName: audience.name,
            audienceId: audience.id,
            audienceSize: audienceSize,
            usageNote: `真實Facebook興趣標籤「${audience.name}」，適合${productAnalysis.productName}的廣告投放。預估觸及人數：${audienceSize.toLocaleString()}`,
            isVerified: true,
          });
        }
      } else {
        console.log(`⚠️  No Facebook audiences found for: ${keyword}`);
      }
    }

    if (recommendations.length === 0) {
      console.log('⚠️  No valid Facebook audiences found. This usually indicates token expiration.');
      throw new Error('Facebook API token may have expired. Please update META_ACCESS_TOKEN.');
    }

    console.log(`✅ Generated ${recommendations.length} verified audience recommendations`);
    return recommendations;

  } catch (error) {
    console.error('❌ Error generating audience recommendations:', error);
    
    // Check if this is a token expiration issue
    if (error.message && error.message.includes('expired')) {
      throw new Error('Facebook API token has expired. Please update META_ACCESS_TOKEN with a fresh token from Facebook Graph API Explorer.');
    }
    
    throw error;
  }
}

// Helper functions for mapping and estimation
function mapCategoryToFacebookType(category: string): 'interests' | 'behaviors' | 'demographics' {
  const lowerCategory = category.toLowerCase();
  
  if (lowerCategory.includes('behavior') || lowerCategory.includes('購買')) {
    return 'behaviors';
  } else if (lowerCategory.includes('age') || lowerCategory.includes('gender') || lowerCategory.includes('地理')) {
    return 'demographics';
  }
  
  return 'interests';
}

function estimateAudienceSize(keyword: string, category: string): number {
  // This would be replaced by actual Facebook API size data
  const baseSize = 1000000;
  const multiplier = Math.random() * 10 + 1;
  return Math.floor(baseSize * multiplier);
}

function generateUsageNote(keyword: string, category: string, productName: string): string {
  return `Facebook興趣標籤「${keyword}」適合${productName}的${category}類別廣告投放。建議用於廣告組合的興趣鎖定設定。`;
}