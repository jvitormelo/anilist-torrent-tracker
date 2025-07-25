import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
	numbers: defineTable({
		value: v.number(),
	}),
	users: defineTable({
		anilistId: v.number(),
		name: v.string(),
		lastActive: v.number(),
	}).index("by_anilistId", ["anilistId"]),
	chatMessages: defineTable({
		anilistId: v.number(),
		message: v.string(),
		timestamp: v.number(),
	}).index("by_timestamp", ["timestamp"]),
	torrentDownloads: defineTable({
		anilistId: v.number(),
		animeName: v.string(),
		episode: v.number(),
		torrentName: v.string(),
		magnetLink: v.string(),
		downloadedAt: v.number(),
		resolution: v.optional(v.string()),
		seeders: v.optional(v.number()),
	}).index("by_anilistId", ["anilistId"])
	  .index("by_downloadedAt", ["downloadedAt"]),
});
