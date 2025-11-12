// SEO 設定和工具函數

export interface SEOConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
}

// 頁面 SEO 設定
export const seoConfig = {
  default: {
    title: "報受眾 - AI 智能廣告受眾分析平台",
    description: "專業的 AI 廣告受眾分析工具，上傳產品圖片即可獲得精準的 Facebook 受眾建議。基於真實 Facebook API 數據，為電商賣家提供最有效的廣告投放策略。",
    image: "https://audai.thinkwithblack.com/og-image.jpg",
    url: "https://audai.thinkwithblack.com",
    type: "website"
  },
  
  landing: {
    title: "報受眾 - AI 分析產品圖片，精準找到 Facebook 廣告受眾",
    description: "使用 AI 技術分析產品圖片，自動生成精準的 Facebook 廣告受眾建議。支援 Facebook 興趣定向、行為定向，幫助電商提升廣告投放效果和 ROI。",
    image: "https://audai.thinkwithblack.com/og-landing.jpg",
    url: "https://audai.thinkwithblack.com",
    type: "website"
  },
  
  analysis: {
    title: "產品分析 - 報受眾 AI 廣告受眾分析",
    description: "上傳產品圖片，AI 智能分析產品特徵並生成 Facebook 廣告受眾建議。精準的興趣定向和行為定向，提升廣告投放效果。",
    image: "https://audai.thinkwithblack.com/og-analysis.jpg",
    url: "https://audai.thinkwithblack.com/analysis",
    type: "website"
  },
  
  dashboard: {
    title: "儀表板 - 報受眾廣告受眾分析平台",
    description: "查看您的 Facebook 廣告受眾分析歷史，追蹤分析成效，管理廣告投放策略。專業的電商廣告數據儀表板。",
    image: "https://audai.thinkwithblack.com/og-dashboard.jpg",
    url: "https://audai.thinkwithblack.com/dashboard",
    type: "website"
  },
  
  history: {
    title: "分析歷史 - 報受眾廣告受眾分析記錄",
    description: "查看所有產品分析歷史和 Facebook 受眾建議記錄。追蹤廣告受眾分析效果，優化電商廣告投放策略。",
    image: "https://audai.thinkwithblack.com/og-history.jpg",
    url: "https://audai.thinkwithblack.com/history",
    type: "website"
  },
  
  settings: {
    title: "設定 - 報受眾用戶設定",
    description: "管理您的報受眾帳戶設定，調整 Facebook 廣告受眾分析偏好，優化使用體驗。",
    image: "https://audai.thinkwithblack.com/og-settings.jpg",
    url: "https://audai.thinkwithblack.com/settings",
    type: "website"
  },
  
  stats: {
    title: "統計數據 - 報受眾使用統計",
    description: "查看您的 Facebook 廣告受眾分析使用統計，了解分析效果和帳戶使用情況。",
    image: "https://audai.thinkwithblack.com/og-stats.jpg",
    url: "https://audai.thinkwithblack.com/stats",
    type: "website"
  }
};

// 生成頁面特定的 SEO 配置
export function getPageSEO(page: keyof typeof seoConfig): SEOConfig {
  return seoConfig[page] || seoConfig.default;
}

// 生成產品特定的 SEO 配置
export function getProductSEO(productName: string, productCategory: string[]): SEOConfig {
  const categoryText = productCategory.join('、');
  
  return {
    title: `${productName} - Facebook 廣告受眾分析 | 報受眾`,
    description: `${productName} 的專業 Facebook 廣告受眾分析。AI 智能分析 ${categoryText} 產品特徵，提供精準的 Facebook 興趣定向和廣告受眾建議。`,
    image: "https://audai.thinkwithblack.com/og-product.jpg",
    url: `https://audai.thinkwithblack.com/analysis`,
    type: "article"
  };
}

// 生成分析結果特定的 SEO 配置
export function getAnalysisSEO(analysis: any): SEOConfig {
  const productName = analysis.productName || '商品';
  const categoryText = analysis.productCategory?.join('、') || '商品';
  
  return {
    title: `${productName} 廣告受眾分析結果 | 報受眾`,
    description: `${productName} 的 Facebook 廣告受眾分析完成。發現 ${categoryText} 相關的精準興趣定向，幫助提升廣告投放效果。`,
    image: "https://audai.thinkwithblack.com/og-result.jpg",
    url: `https://audai.thinkwithblack.com/analysis`,
    type: "article"
  };
}