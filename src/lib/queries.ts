import { queryOptions } from "@tanstack/react-query";
import { getCurrentUser, getSeasonAnimeList } from "server";

export const userQueryOptions = (userName: string | undefined) =>
	queryOptions({
		queryKey: ["user", userName],
		queryFn: async () => {
			if (!userName) throw new Error("No username");
			const response = await getCurrentUser({ data: { userName } });
			if (response.errors?.length) {
				throw new Error(response.errors[0].message);
			}
			return response.data.User;
		},
		enabled: !!userName,
		retry: false,
		staleTime: 5 * 60 * 1000,
	});

export const seasonListQueryOptions = (userName: string | undefined) =>
	queryOptions({
		queryKey: ["seasonAnimeList", userName],
		queryFn: async () => {
			if (!userName) throw new Error("No username");
			const response = await getSeasonAnimeList({ data: { userName } });
			if (response.errors?.length) {
				throw new Error(response.errors[0].message);
			}
			const lists = response.data.MediaListCollection?.lists || [];
			return lists.flatMap((list) => list.entries);
		},
		enabled: !!userName,
		retry: false,
		staleTime: 5 * 60 * 1000,
	});
