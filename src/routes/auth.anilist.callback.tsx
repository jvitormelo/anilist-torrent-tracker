import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/auth/anilist/callback")({
	component: RouteComponent,
});

function RouteComponent() {
	const router = useRouter();

	useEffect(() => {
		const hash = window.location.hash.substring(1);
		const params = new URLSearchParams(hash);
		const accessToken = params.get("access_token");
		const tokenType = params.get("token_type");
		const expiresIn = params.get("expires_in");

		if (accessToken) {
			localStorage.setItem("anilist_token", accessToken);
			router.navigate({ to: "/" });
		}

		console.log({ accessToken, tokenType, expiresIn });
	}, [router]);

	return (
		<div>
			<h1>Anilist Auth Callback</h1>
		</div>
	);
}
