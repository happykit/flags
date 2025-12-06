import { Content } from "components/Content";
import { Result } from "components/Result";
import { getFlags } from "flags/server";
import { cookies } from "next/headers";

const title = "Server Components";
export const metadata = {
	title: `${title} · HappyKit Flags Documentation`,
	description: "Feature Flags for Next.js",
};

export default async function ServerComponentPage() {
	const jar = await cookies();
	const visitorKey = jar.get("hkvk")?.value;
	const flags = await getFlags({ visitorKey });

	return (
		<Content
			title={title}
			source={`https://github.com/happykit/flags/blob/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/example/app/demo/server-components/page.tsx`}
		>
			<article className="py-4 prose max-w-prose">
				<p>
					This demo shows how to use <code>@happykit/flags</code> for server
					components in Next.js App Router.
				</p>
				<p>
					Since this page is rendered on the server only, there is no{" "}
					<code>flagBag</code>. Instead, the values are shown directly.
				</p>
				<Result key="server-components" label="Flags" value={flags} />
			</article>
		</Content>
	);
}
