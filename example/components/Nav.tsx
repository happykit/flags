import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/dist/client/router";

function NavLink(props: {
  href: string;
  children: React.ReactNode;
  indent?: boolean;
}) {
  const router = useRouter();
  const active = router.asPath === props.href;
  return (
    <Link href={props.href}>
      <a
        className={[
          "group w-full flex items-center pr-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:text-gray-900 hover:bg-gray-50",
          props.indent ? "pl-10" : "pl-7",
          active
            ? "bg-gray-100 text-gray-900"
            : "bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900",
        ].join(" ")}
      >
        {props.children}
      </a>
    </Link>
  );
}

export function Nav() {
  return (
    <React.Fragment>
      <div>
        <NavLink href="/">Introduction</NavLink>
      </div>
      <div className="space-y-1">
        <div className="bg-white text-gray-600 group w-full flex items-center pl-7 pr-2 py-2 text-sm font-medium rounded-md">
          Examples
        </div>
        {/* Expandable link section, show/hide based on state. */}
        <div className="space-y-1">
          <NavLink indent href="/examples/basic-usage">
            Basic Usage
          </NavLink>
          <NavLink indent href="/examples/disabled-revalidation">
            Disabled Revalidation
          </NavLink>
          <NavLink indent href="/examples/pure-static-site-generation">
            Static Site Generation (Pure)
          </NavLink>
          <NavLink indent href="/examples/hybrid-static-site-generation">
            Static Site Generation (Hybrid)
          </NavLink>
          <NavLink indent href="/examples/pure-server-side-rendering">
            Server-Side Rendering (Pure)
          </NavLink>
          <NavLink indent href="/examples/hybrid-server-side-rendering">
            Server-Side Rendering (Hybrid)
          </NavLink>
          <NavLink indent href="/examples/targeting-by-traits">
            Targeting by Traits
          </NavLink>
          <NavLink indent href="/examples/targeting-by-user">
            Targeting by User
          </NavLink>
          <NavLink indent href="/examples/targeting-by-visitor-key">
            Targeting by Visitor Key
          </NavLink>
          <NavLink indent href="/examples/context">
            Context
          </NavLink>
        </div>
      </div>
    </React.Fragment>
  );
}
