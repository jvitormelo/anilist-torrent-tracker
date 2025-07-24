import { createFileRoute, useRouter } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { getCurrentUser } from "server";
import { KawaiiLoading } from "~/components/KawaiiLoading";

export const Route = createFileRoute("/auth/anilist/callback")({
	component: RouteComponent,
});

function RouteComponent() {
	const router = useRouter();

	const setLastActive = useMutation(api.myFunctions.setLastActive);

	useEffect(() => {
		const hash = window.location.hash.substring(1);
		const params = new URLSearchParams(hash);
		const accessToken = params.get("access_token");

		if (accessToken) {
			localStorage.setItem("anilist_token", accessToken);

			getCurrentUser({ headers: { Authorization: `Bearer ${accessToken}` } })
				.then((user) => {
					if (user.data.Viewer) {
						setLastActive({ anilistId: user.data.Viewer.id, name: user.data.Viewer.name });
					}
				});

			router.navigate({ to: "/" });
		}
	}, [router]);

	return (
		<div className="flex flex-col items-center justify-center h-screen">
			<KawaiiLoading size="lg" />
		</div>
	);
}
