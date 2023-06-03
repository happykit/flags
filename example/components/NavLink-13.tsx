"use client";
// This component is duplicated as NavLink-12 and NavLink-13
//   - NavLink-12 is used by the pages directory
//   - NavLink-13 is used by the app directory
// This is necessary as the router is accessed differently.
import * as React from "react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

export function NavLink(props: {
  href: string;
  children: React.ReactNode;
  indent?: boolean;
}) {
  const activeSegment = useSelectedLayoutSegment();
  const active = activeSegment ? props.href.endsWith(activeSegment) : false;

  return (
    <Link
      href={props.href}
      className={[
        "group w-full flex items-center pr-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:text-gray-900 hover:bg-gray-50",
        props.indent ? "pl-10" : "pl-7",
        active
          ? "bg-gray-100 text-gray-900"
          : "bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900",
      ].join(" ")}
    >
      {props.children}
    </Link>
  );
}
