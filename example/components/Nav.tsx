import * as React from "react";

export function Nav({
	NavLink,
}: {
	NavLink: (props: {
		href: string;
		children: React.ReactNode;
		indent?: boolean | undefined;
	}) => React.ReactElement;
}) {
	return (
		<React.Fragment>
			<div>
				<NavLink href="/">Introduction</NavLink>
			</div>
			<div>
				<NavLink href="/demo/basic-usage">Basic Usage</NavLink>
			</div>
			<div className="bg-white text-gray-600 group w-full flex items-center pl-7 pr-2 py-2 text-sm font-medium rounded-md">
				App Router
			</div>
			<div className="space-y-1 list-disc">
				<NavLink indent href="/demo/client-components">
					Client Components
				</NavLink>
				<NavLink indent href="/demo/server-components">
					Server Components
				</NavLink>
			</div>
			<div className="bg-white text-gray-600 group w-full flex items-center pl-7 pr-2 py-2 text-sm font-medium rounded-md">
				Pages Router
			</div>
			<div className="space-y-1 list-disc">
				<NavLink indent href="/demo/client-side-rendering">
					Client-Side Rendering
				</NavLink>
				<NavLink indent href="/demo/server-side-rendering-pure">
					Server-Side Rendering (Pure)
				</NavLink>
				<NavLink indent href="/demo/server-side-rendering-hybrid">
					Server-Side Rendering (Hybrid)
				</NavLink>
				<NavLink indent href="/demo/static-site-generation-pure">
					Static Site Generation (Pure)
				</NavLink>
				<NavLink indent href="/demo/static-site-generation-hybrid">
					Static Site Generation (Hybrid)
				</NavLink>
				<NavLink indent href="/demo/middleware">
					Middleware
				</NavLink>
			</div>
			<div className="bg-white text-gray-600 group w-full flex items-center pl-7 pr-2 py-2 text-sm font-medium rounded-md">
				Targeting and Rules
			</div>
			<div className="space-y-1">
				<NavLink indent href="/demo/targeting-by-visitor-key">
					Targeting by Visitor Key
				</NavLink>
				<NavLink indent href="/demo/targeting-by-user">
					Targeting by User
				</NavLink>
				<NavLink indent href="/demo/targeting-by-traits">
					Targeting by Traits
				</NavLink>
			</div>
			<div>
				<NavLink href="/demo/rollouts">Rollouts</NavLink>
			</div>
			<div className="bg-white text-gray-600 group w-full flex items-center pl-7 pr-2 py-2 text-sm font-medium rounded-md">
				Options and Patterns
			</div>
			<div className="space-y-1">
				<NavLink indent href="/demo/disabled-revalidation">
					Disabled Revalidation
				</NavLink>
				<NavLink indent href="/demo/context">
					Context
				</NavLink>
			</div>
			<div>
				<NavLink href="/demo/dynamics">Dynamics</NavLink>
			</div>
			<div>
				<NavLink href="/docs/public-api">Public API</NavLink>
			</div>
		</React.Fragment>
	);
}
