import * as React from "react";

export function Divider(props: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-gray-300" />
      </div>
      <div className="relative flex justify-center">
        <span className="px-2 bg-gray-100 text-sm text-gray-500">
          {props.children}
        </span>
      </div>
    </div>
  );
}
