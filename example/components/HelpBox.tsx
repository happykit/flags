import * as React from "react";

export function HelpBox() {
  return (
    <div className="rounded-md bg-blue-50 border-blue-200 border px-4 py-2">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-blue-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <p className="text-sm text-blue-600">
            In case something is unclear, feel free to open an issue at{" "}
            <a href="https://github.com/happykit/flags">
              github.com/happykit/flags
            </a>{" "}
            or send a DM to{" "}
            <a href="https://twitter.com/happykitdev">@happykitdev</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
