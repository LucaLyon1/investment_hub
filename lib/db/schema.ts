import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const positions = sqliteTable('positions', {
  id: text('id').primaryKey(),
  ticker: text('ticker').notNull(),
  name: text('name').notNull(),
  assetClass: text('asset_class', {
    enum: ['stock', 'etf', 'bond', 'commodity'],
  }).notNull(),
  quantity: real('quantity').notNull(),
  avgBuyPrice: real('avg_buy_price').notNull(),
  currency: text('currency').notNull().default('USD'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const priceCache = sqliteTable('price_cache', {
  ticker: text('ticker').primaryKey(),
  price: real('price').notNull(),
  change1d: real('change_1d'),
  changePct1d: real('change_pct_1d'),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
})

export const portfolioSnapshots = sqliteTable('portfolio_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  totalValue: real('total_value').notNull(),
  totalCost: real('total_cost').notNull(),
  totalPnl: real('total_pnl').notNull(),
  pnlPct: real('pnl_pct').notNull(),
})

export const aiIdeas = sqliteTable('ai_ideas', {
  id: text('id').primaryKey(),
  ticker: text('ticker'),
  assetClass: text('asset_class', {
    enum: ['stock', 'etf', 'bond', 'commodity', 'portfolio'],
  }),
  signalType: text('signal_type', {
    enum: ['buy', 'sell', 'hold', 'rebalance', 'risk_flag', 'news'],
  }).notNull(),
  riskLevel: text('risk_level', {
    enum: ['low', 'medium', 'high'],
  }).notNull(),
  title: text('title').notNull(),
  reasoning: text('reasoning').notNull(),
  sources: text('sources'),
  status: text('status', {
    enum: ['pending', 'approved', 'dismissed'],
  })
    .notNull()
    .default('pending'),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
  actedAt: integer('acted_at', { mode: 'timestamp' }),
})

export const notificationLog = sqliteTable('notification_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['morning_recap', 'morning_brief', 'idea_alert'] }).notNull(),
  channel: text('channel', { enum: ['telegram', 'email'] }).notNull(),
  status: text('status', { enum: ['sent', 'failed'] }).notNull(),
  errorMessage: text('error_message'),
  sentAt: integer('sent_at', { mode: 'timestamp' }).notNull(),
})

export const rssFeeds = sqliteTable('rss_feeds', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export type RssFeed = typeof rssFeeds.$inferSelect
export type NewRssFeed = typeof rssFeeds.$inferInsert

export type Position = typeof positions.$inferSelect
export type NewPosition = typeof positions.$inferInsert
export type PriceCache = typeof priceCache.$inferSelect
export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect
export type AiIdea = typeof aiIdeas.$inferSelect
export type NewAiIdea = typeof aiIdeas.$inferInsert
