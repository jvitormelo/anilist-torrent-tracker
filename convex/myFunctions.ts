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

// query to list users
export const listUsers = query({
	handler: async (ctx) => {
		const users = await ctx.db.query("onlineUsers").collect();
		return users;
	},
});

// set last active, add user if not exists
export const setLastActive = mutation({
	args: {
		anilistId: v.number(),
		name: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db.query("onlineUsers").filter((q) => q.eq(q.field("anilistId"), args.anilistId)).first();	
		if (!user) {
			await ctx.db.insert("onlineUsers", { anilistId: args.anilistId, lastActive: Date.now(), name: args.name });
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
			.query("onlineUsers")
			.filter((q) => q.gte(q.field("lastActive"), fiveMinutesAgo))
			.collect();
		return onlineUsers.length;
	},
});