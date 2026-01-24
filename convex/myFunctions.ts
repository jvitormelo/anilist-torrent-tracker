import { v } from "convex/values";
import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";

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

// record torrent download
export const recordTorrentDownload = mutation({
	args: {
		anilistId: v.number(),
		animeName: v.string(),
		episode: v.number(),
		torrentName: v.string(),
		magnetLink: v.string(),
		resolution: v.optional(v.string()),
		seeders: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		// Check if this user has already downloaded this specific torrent
		const existingDownload = await ctx.db
			.query("torrentDownloads")
			.filter((q) =>
				q.and(
					q.eq(q.field("anilistId"), args.anilistId),
					q.eq(q.field("animeName"), args.animeName),
					q.eq(q.field("magnetLink"), args.magnetLink),
				),
			)
			.first();

		// Only insert if no existing download found
		if (!existingDownload) {
			await ctx.db.insert("torrentDownloads", {
				anilistId: args.anilistId,
				animeName: args.animeName,
				episode: args.episode,
				torrentName: args.torrentName,
				magnetLink: args.magnetLink,
				downloadedAt: Date.now(),
				resolution: args.resolution,
				seeders: args.seeders,
			});
		}
	},
});
