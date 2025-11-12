import {
  users,
  analyses,
  analysisImages,
  analysisCosts,
  audienceRecommendations,
  usageStats,
  type User,
  type UpsertUser,
  type Analysis,
  type InsertAnalysis,
  type AnalysisImage,
  type InsertAnalysisImage,
  type AnalysisCost,
  type InsertAnalysisCost,
  type AudienceRecommendation,
  type InsertAudienceRecommendation,
  type UsageStats,
  type InsertUsageStats,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Analysis operations
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysisByUserId(userId: string, limit?: number): Promise<Analysis[]>;
  getAnalysisById(id: number): Promise<Analysis | undefined>;
  updateAnalysis(id: number, updates: Partial<InsertAnalysis>): Promise<Analysis>;
  createAnalysisImages(images: InsertAnalysisImage[]): Promise<AnalysisImage[]>;
  getAnalysisImagesByAnalysisId(analysisId: number): Promise<AnalysisImage[]>;
  upsertAnalysisCost(cost: InsertAnalysisCost): Promise<AnalysisCost>;
  getAnalysisCostByAnalysisId(analysisId: number): Promise<AnalysisCost | undefined>;
  
  // Audience recommendation operations
  createAudienceRecommendations(recommendations: InsertAudienceRecommendation[]): Promise<AudienceRecommendation[]>;
  getAudienceRecommendationsByAnalysisId(analysisId: number): Promise<AudienceRecommendation[]>;
  
  // Usage statistics operations
  upsertUsageStats(stats: InsertUsageStats): Promise<UsageStats>;
  getUserUsageStats(userId: string, month: string): Promise<UsageStats | undefined>;
  getUserTotalStats(userId: string): Promise<{
    totalAnalyses: number;
    totalAudiences: number;
    currentMonthAnalyses: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // 首先檢查是否有相同 email 的用戶
    const existingUserByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email!));
    
    if (existingUserByEmail.length > 0) {
      const existingUser = existingUserByEmail[0];
      const oldUserId = existingUser.id;
      const newUserId = userData.id;
      
      // 如果 ID 相同，只需更新其他資料
      if (oldUserId === newUserId) {
        const [updatedUser] = await db
          .update(users)
          .set({
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email!))
          .returning();
        return updatedUser;
      }
      
      // 如果 ID 不同，需要遷移所有相關記錄
      console.log(`正在遷移用戶資料：${oldUserId} → ${newUserId}`);
      
      // 使用事務確保數據一致性
      const result = await db.transaction(async (tx) => {
        // 1. 臨時修改舊用戶的 email 以避免唯一約束衝突
        await tx
          .update(users)
          .set({ email: `temp-old-${Date.now()}-${userData.email}` })
          .where(eq(users.id, oldUserId));
        
        // 2. 創建新的用戶記錄
        const [newUser] = await tx
          .insert(users)
          .values({
            id: newUserId,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            createdAt: existingUser.createdAt, // 保留原來的創建時間
            updatedAt: new Date(),
          })
          .returning();
        
        // 3. 更新分析記錄中的用戶 ID
        await tx
          .update(analyses)
          .set({ userId: newUserId })
          .where(eq(analyses.userId, oldUserId));
        
        // 4. 更新使用統計記錄（如果有的話）
        await tx
          .update(usageStats)
          .set({ userId: newUserId })
          .where(eq(usageStats.userId, oldUserId));
        
        // 5. 刪除舊的用戶記錄
        await tx
          .delete(users)
          .where(eq(users.id, oldUserId));
        
        return newUser;
      });
      
      const updatedUser = result;
      
      console.log(`✅ 用戶資料遷移完成：${oldUserId} → ${newUserId}`);
      return updatedUser;
    }
    
    // 如果沒有相同 email 的用戶，使用標準 upsert
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Analysis operations
  async createAnalysis(analysis: InsertAnalysis): Promise<Analysis> {
    const [newAnalysis] = await db
      .insert(analyses)
      .values(analysis)
      .returning();
    return newAnalysis;
  }

  async getAnalysisByUserId(userId: string, limit = 10): Promise<Analysis[]> {
    return await db
      .select()
      .from(analyses)
      .where(eq(analyses.userId, userId))
      .orderBy(desc(analyses.createdAt))
      .limit(limit);
  }

  async getAnalysisById(id: number): Promise<Analysis | undefined> {
    const [analysis] = await db
      .select()
      .from(analyses)
      .where(eq(analyses.id, id));
    return analysis;
  }

  async updateAnalysis(id: number, updates: Partial<InsertAnalysis>): Promise<Analysis> {
    const [updatedAnalysis] = await db
      .update(analyses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(analyses.id, id))
      .returning();
    return updatedAnalysis;
  }

  async createAnalysisImages(images: InsertAnalysisImage[]): Promise<AnalysisImage[]> {
    if (!images || images.length === 0) {
      return [];
    }

    const inserted = await db
      .insert(analysisImages)
      .values(images)
      .returning();

    return inserted;
  }

  async getAnalysisImagesByAnalysisId(analysisId: number): Promise<AnalysisImage[]> {
    return await db
      .select()
      .from(analysisImages)
      .where(eq(analysisImages.analysisId, analysisId))
      .orderBy(analysisImages.position);
  }

  async upsertAnalysisCost(cost: InsertAnalysisCost): Promise<AnalysisCost> {
    const [existing] = await db
      .select()
      .from(analysisCosts)
      .where(eq(analysisCosts.analysisId, cost.analysisId));

    if (existing) {
      const [updated] = await db
        .update(analysisCosts)
        .set({
          imageCount: cost.imageCount,
          openaiInputTokens: cost.openaiInputTokens,
          openaiOutputTokens: cost.openaiOutputTokens,
          openaiCostUsd: cost.openaiCostUsd,
          googleVisionCalls: cost.googleVisionCalls,
          googleVisionCostUsd: cost.googleVisionCostUsd,
          metaQueries: cost.metaQueries,
          totalCostUsd: cost.totalCostUsd,
          totalCostJpy: cost.totalCostJpy,
          estimatedCredits: cost.estimatedCredits,
        })
        .where(eq(analysisCosts.id, existing.id))
        .returning();

      return updated;
    }

    const [created] = await db
      .insert(analysisCosts)
      .values(cost)
      .returning();

    return created;
  }

  async getAnalysisCostByAnalysisId(analysisId: number): Promise<AnalysisCost | undefined> {
    const [cost] = await db
      .select()
      .from(analysisCosts)
      .where(eq(analysisCosts.analysisId, analysisId));

    return cost;
  }

  // Audience recommendation operations
  async createAudienceRecommendations(recommendations: InsertAudienceRecommendation[]): Promise<AudienceRecommendation[]> {
    return await db
      .insert(audienceRecommendations)
      .values(recommendations)
      .returning();
  }

  async getAudienceRecommendationsByAnalysisId(analysisId: number): Promise<AudienceRecommendation[]> {
    return await db
      .select()
      .from(audienceRecommendations)
      .where(eq(audienceRecommendations.analysisId, analysisId))
      .orderBy(audienceRecommendations.audienceType);
  }

  // Usage statistics operations
  async upsertUsageStats(stats: InsertUsageStats): Promise<UsageStats> {
    const [usageStat] = await db
      .insert(usageStats)
      .values(stats)
      .onConflictDoUpdate({
        target: [usageStats.userId, usageStats.month],
        set: {
          analysisCount: stats.analysisCount,
          totalAudiences: stats.totalAudiences,
          updatedAt: new Date(),
        },
      })
      .returning();
    return usageStat;
  }

  async getUserUsageStats(userId: string, month: string): Promise<UsageStats | undefined> {
    const [stats] = await db
      .select()
      .from(usageStats)
      .where(and(eq(usageStats.userId, userId), eq(usageStats.month, month)));
    return stats;
  }

  async getUserTotalStats(userId: string): Promise<{
    totalAnalyses: number;
    totalAudiences: number;
    currentMonthAnalyses: number;
  }> {
    const userAnalyses = await db
      .select()
      .from(analyses)
      .where(eq(analyses.userId, userId));

    const totalAnalyses = userAnalyses.length;
    
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const currentMonthAnalyses = userAnalyses.filter(analysis => 
      analysis.createdAt && analysis.createdAt.toISOString().slice(0, 7) === currentMonth
    ).length;

    const userRecommendations = await db
      .select()
      .from(audienceRecommendations)
      .innerJoin(analyses, eq(audienceRecommendations.analysisId, analyses.id))
      .where(eq(analyses.userId, userId));

    const totalAudiences = userRecommendations.length;

    return {
      totalAnalyses,
      totalAudiences,
      currentMonthAnalyses,
    };
  }
}

export const storage = new DatabaseStorage();
