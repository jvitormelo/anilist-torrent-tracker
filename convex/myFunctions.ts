import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// You can read data from the database via a query:
export const listNumbers = query({
	// Validators for arguments.
	args: {
		count: v.number(),
	},

	// Query implementation.
	handler: async (ctx, args) => {
		//// Read the database as many times as you need here.
		//// See https://docs.convex.dev/database/reading-data.
		const numbers = await ctx.db
			.query("numbers")
			// Ordered by _creationTime, return most recent
			.order("desc")
			.take(args.count);
		return {
			viewer: (await ctx.auth.getUserIdentity())?.name ?? null,
			numbers: numbers.reverse().map((number) => number.value),
		};
	},
});

// You can write data to the database via a mutation:
export const addNumber = mutation({
	// Validators for arguments.
	args: {
		value: v.number(),
	},

	// Mutation implementation.
	handler: async (ctx, args) => {
		//// Insert or modify documents in the database here.
		//// Mutations can also read from the database like queries.
		//// See https://docs.convex.dev/database/writing-data.

		const id = await ctx.db.insert("numbers", { value: args.value });

		console.log("Added new document with id:", id);
		// Optionally, return a value from your mutation.
		// return id;
	},
});

// You can fetch data from and send data to third-party APIs via an action:
export const myAction = action({
	// Validators for arguments.
	args: {
		first: v.number(),
	},

	// Action implementation.
	handler: async (ctx, args) => {
		//// Use the browser-like `fetch` API to send HTTP requests.
		//// See https://docs.convex.dev/functions/actions#calling-third-party-apis-and-using-npm-packages.
		// const response = await ctx.fetch("https://api.thirdpartyservice.com");
		// const data = await response.json();

		//// Query data by running Convex queries.
		const data = await ctx.runQuery(api.myFunctions.listNumbers, {
			count: 10,
		});
		console.log(data);

		//// Write data by running Convex mutations.
		await ctx.runMutation(api.myFunctions.addNumber, {
			value: args.first,
		});
	},
});

// set last active, add user if not exists
export const setLastActive = mutation({
	args: {
		anilistId: v.number(),
		name: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db.query("users").filter((q) => q.eq(q.field("anilistId"), args.anilistId)).first();	
		if (!user) {
			await ctx.db.insert("users", { anilistId: args.anilistId, lastActive: Date.now(), name: args.name });
		} else {
			await ctx.db.patch(user._id, { lastActive: Date.now() });
		}
	},
});

// count online users (active in the last 5 minutes)
export const countOnlineUsers = query({
	handler: async (ctx) => {
		const fiveMinutesAgo = Date.now() - 5 * 60 * 1000; // 5 minutes in milliseconds
		const onlineUsers = await ctx.db
			.query("users")
			.filter((q) => q.gte(q.field("lastActive"), fiveMinutesAgo))
			.collect();
		return onlineUsers.length;
	},
});

// send chat message
export const sendChatMessage = mutation({
	args: {
		anilistId: v.number(),
		message: v.string(),
	},
	handler: async (ctx, args) => {
		// Trim and validate message
		const trimmedMessage = args.message.trim();
		if (!trimmedMessage || trimmedMessage.length > 500) {
			throw new Error("Message must be between 1 and 500 characters");
		}

		// Get user from users table to ensure they exist
		const user = await ctx.db.query("users").filter((q) => q.eq(q.field("anilistId"), args.anilistId)).first();
		if (!user) {
			throw new Error("User not found");
		}

		await ctx.db.insert("chatMessages", {
			anilistId: args.anilistId,
			message: trimmedMessage,
			timestamp: Date.now(),
		});
	},
});

// get recent chat messages
export const getChatMessages = query({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 50;
		const messages = await ctx.db
			.query("chatMessages")
			.withIndex("by_timestamp")
			.order("desc")
			.take(limit);
		
		// Get user names for each message
		const messagesWithUsers = await Promise.all(
			messages.map(async (message) => {
				const user = await ctx.db.query("users").filter((q) => q.eq(q.field("anilistId"), message.anilistId)).first();
				return {
					...message,
					userName: user?.name || "Unknown User"
				};
			})
		);
		
		return messagesWithUsers.reverse(); // Return in chronological order (oldest first)
	},
});