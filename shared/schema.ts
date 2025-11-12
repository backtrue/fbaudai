import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product analyses table
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  coverImageUrl: text("cover_image_url"),
  productName: text("product_name").notNull(),
  productCategory: jsonb("product_category").notNull(), // Array of categories
  targetAudience: jsonb("target_audience").notNull(), // Array of target demographics
  keywords: jsonb("keywords").notNull(), // Array of keywords
  confidence: decimal("confidence", { precision: 3, scale: 2 }).notNull(),
  priceRange: varchar("price_range"),
  salesRegion: varchar("sales_region"),
  clusterSummary: jsonb("cluster_summary"), // 重疊性分析結果
  personaInsights: jsonb("persona_insights"), // Persona 分析
  creativeBriefs: jsonb("creative_briefs"), // 創意建議
  finalProductSummary: text("final_product_summary"),
  fallbackConfidence: decimal("fallback_confidence", { precision: 4, scale: 3 }),
  isConfirmed: boolean("is_confirmed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const analysisImages = pgTable("analysis_images", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").notNull().references(() => analyses.id),
  imageUrl: text("image_url").notNull(),
  position: integer("position").notNull().default(0),
  googleVisionObjects: jsonb("google_vision_objects"),
  googleVisionLabels: jsonb("google_vision_labels"),
  ocrTexts: jsonb("ocr_texts"),
  dominantColors: jsonb("dominant_colors"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const analysisCosts = pgTable("analysis_costs", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").notNull().references(() => analyses.id),
  imageCount: integer("image_count").default(0),
  openaiInputTokens: integer("openai_input_tokens").default(0),
  openaiOutputTokens: integer("openai_output_tokens").default(0),
  openaiCostUsd: decimal("openai_cost_usd", { precision: 8, scale: 4 }).default("0"),
  googleVisionCalls: integer("google_vision_calls").default(0),
  googleVisionCostUsd: decimal("google_vision_cost_usd", { precision: 8, scale: 4 }).default("0"),
  metaQueries: integer("meta_queries").default(0),
  totalCostUsd: decimal("total_cost_usd", { precision: 8, scale: 4 }).default("0"),
  totalCostJpy: decimal("total_cost_jpy", { precision: 10, scale: 2 }).default("0"),
  estimatedCredits: decimal("estimated_credits", { precision: 6, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audience recommendations table
export const audienceRecommendations = pgTable("audience_recommendations", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").notNull().references(() => analyses.id),
  audienceType: varchar("audience_type").notNull(), // 'interest', 'behavior', 'demographic', 'brand'
  audienceName: text("audience_name").notNull(),
  audienceId: varchar("audience_id"), // Facebook audience ID if available
  audienceSize: integer("audience_size"), // Estimated reach
  usageNote: text("usage_note").notNull(),
  isVerified: boolean("is_verified").default(false), // Whether it's verified via Meta Graph API
  createdAt: timestamp("created_at").defaultNow(),
});

// Usage statistics table
export const usageStats = pgTable("usage_stats", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  month: varchar("month").notNull(), // Format: YYYY-MM
  analysisCount: integer("analysis_count").default(0),
  totalAudiences: integer("total_audiences").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserMonth: unique().on(table.userId, table.month),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  analyses: many(analyses),
  usageStats: many(usageStats),
}));

export const analysesRelations = relations(analyses, ({ one, many }) => ({
  user: one(users, {
    fields: [analyses.userId],
    references: [users.id],
  }),
  images: many(analysisImages),
  costs: one(analysisCosts, {
    fields: [analyses.id],
    references: [analysisCosts.analysisId],
  }),
  audienceRecommendations: many(audienceRecommendations),
}));

export const audienceRecommendationsRelations = relations(audienceRecommendations, ({ one }) => ({
  analysis: one(analyses, {
    fields: [audienceRecommendations.analysisId],
    references: [analyses.id],
  }),
}));

export const analysisImagesRelations = relations(analysisImages, ({ one }) => ({
  analysis: one(analyses, {
    fields: [analysisImages.analysisId],
    references: [analyses.id],
  }),
}));

export const analysisCostsRelations = relations(analysisCosts, ({ one }) => ({
  analysis: one(analyses, {
    fields: [analysisCosts.analysisId],
    references: [analyses.id],
  }),
}));

export const usageStatsRelations = relations(usageStats, ({ one }) => ({
  user: one(users, {
    fields: [usageStats.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAudienceRecommendationSchema = createInsertSchema(audienceRecommendations).omit({
  id: true,
  createdAt: true,
});

export const insertAnalysisImageSchema = createInsertSchema(analysisImages).omit({
  id: true,
  createdAt: true,
});

export const insertAnalysisCostSchema = createInsertSchema(analysisCosts).omit({
  id: true,
  createdAt: true,
});

export const insertUsageStatsSchema = createInsertSchema(usageStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type AnalysisImage = typeof analysisImages.$inferSelect;
export type InsertAnalysisImage = z.infer<typeof insertAnalysisImageSchema>;
export type AudienceRecommendation = typeof audienceRecommendations.$inferSelect;
export type InsertAudienceRecommendation = z.infer<typeof insertAudienceRecommendationSchema>;
export type UsageStats = typeof usageStats.$inferSelect;
export type InsertUsageStats = z.infer<typeof insertUsageStatsSchema>;
export type AnalysisCost = typeof analysisCosts.$inferSelect;
export type InsertAnalysisCost = z.infer<typeof insertAnalysisCostSchema>;
