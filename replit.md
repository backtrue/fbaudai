# 報受眾 - AI 廣告受眾分析平台

## Overview
「報受眾」是一個專業的 AI 廣告受眾分析平台，專為電商賣家設計，旨在提升廣告投資報酬率（ROI）。它透過用戶上傳產品圖片，運用多模態深度學習技術進行智能分析，並基於真實 Facebook API 數據生成精準的廣告受眾建議。作為「報數據」服務的延伸，此平台專注於廣告投放的精準化，幫助電商賣家找到最有可能購買的顧客。

## User Preferences
Preferred communication style: Simple, everyday language.
Authentication requirement: Must integrate with eccal.thinkwithblack.com for unified member system across services.

## System Architecture

### UI/UX Decisions
- **Frontend Framework**: React with TypeScript.
- **UI Library**: Radix UI components with shadcn/ui styling.
- **Styling**: Tailwind CSS with a custom design system.
- **Form Management**: React Hook Form with Zod validation.
- **File Upload**: React Dropzone for image uploads with preview and validation.

### Technical Implementations
- **Backend**: Node.js with Express.js, using TypeScript and ESM modules.
- **Database**: PostgreSQL (Neon serverless) managed by Drizzle ORM for type-safe operations and Drizzle Kit for schema migrations.
- **AI Analysis Service**: Utilizes OpenAI GPT-4o Vision for product image analysis, marketing intelligence, and audience insights, generating structured JSON outputs with confidence scores.
- **Facebook Graph API Integration**: Verifies audience targeting options and provides real-time audience size estimates.
- **Authentication System**: Primarily Google OAuth, integrated with `eccal.thinkwithblack.com` for a unified member system, using JWT tokens for secure session management.
- **File Processing**: Multer for multipart forms and Sharp for image optimization.

### Feature Specifications
- **Image Analysis**: Comprehensive product analysis by AI, identifying product categories, target demographics, and marketing keywords.
- **Audience Generation**: AI-driven recommendations for Facebook audience targeting.
- **Usage Tracking**: Records user activities for dashboard display and credit limits.

### System Design Choices
- **RESTful API Design**: Structured endpoints with robust error handling.
- **Data Flow**: Secure user authentication (OAuth), image upload, AI analysis, audience generation, API verification, results display, and usage tracking.
- **Deployment**: Vite for frontend builds, ESBuild for backend bundling, and Replit for development environment with live preview.

## External Dependencies

### Core Services
- **OpenAI API**: For GPT-4o Vision and advanced AI marketing insights.
- **Meta Graph API**: For Facebook audience verification and sizing.
- **Neon Database**: Serverless PostgreSQL hosting.
- **Replit Auth**: For initial OAuth authentication (transitioning to `eccal.thinkwithblack.com`).
- **eccal.thinkwithblack.com**: Unified authentication and member system.

### Development Tools
- **Vite**: Frontend build tool.
- **Drizzle Kit**: Database schema management.
- **TypeScript**: For type safety across the stack.
- **ESBuild**: Server-side bundling.