import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

export function SEOHead({ 
  title = "報受眾 - AI 智能廣告受眾分析平台",
  description = "專業的 AI 廣告受眾分析工具，上傳產品圖片即可獲得精準的 Facebook 受眾建議。基於真實 Facebook API 數據，為電商賣家提供最有效的廣告投放策略。",
  image = "https://audai.thinkwithblack.com/og-image.jpg",
  url = "https://audai.thinkwithblack.com",
  type = "website"
}: SEOHeadProps) {
  
  useEffect(() => {
    // Update document title
    document.title = title;
    
    // Update meta description
    updateMetaTag('description', description);
    
    // Update Open Graph tags
    updateMetaTag('og:title', title, 'property');
    updateMetaTag('og:description', description, 'property');
    updateMetaTag('og:image', image, 'property');
    updateMetaTag('og:url', url, 'property');
    updateMetaTag('og:type', type, 'property');
    updateMetaTag('og:site_name', '報受眾', 'property');
    updateMetaTag('og:locale', 'zh_TW', 'property');
    
    // Update Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image', 'name');
    updateMetaTag('twitter:title', title, 'name');
    updateMetaTag('twitter:description', description, 'name');
    updateMetaTag('twitter:image', image, 'name');
    
    // Update canonical URL
    updateCanonicalLink(url);
    
    // Add structured data
    updateStructuredData({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "報受眾",
      "description": description,
      "url": url,
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "TWD"
      },
      "creator": {
        "@type": "Organization",
        "name": "報數據",
        "url": "https://thinkwithblack.com"
      }
    });
    
  }, [title, description, image, url, type]);

  return null;
}

function updateMetaTag(name: string, content: string, attribute: string = 'name') {
  let element = document.querySelector(`meta[${attribute}="${name}"]`);
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
}

function updateCanonicalLink(url: string) {
  let link = document.querySelector('link[rel="canonical"]');
  
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  
  link.setAttribute('href', url);
}

function updateStructuredData(data: any) {
  let script = document.querySelector('script[type="application/ld+json"]');
  
  if (!script) {
    script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    document.head.appendChild(script);
  }
  
  script.textContent = JSON.stringify(data);
}