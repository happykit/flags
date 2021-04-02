import * as React from "react";
import { Layout } from "../components/Layout";
import { useFlags } from "@happykit/flags/client";
import { Result } from "../components/Result";

export default function Index() {
  const flagBag = useFlags();
  return (
    <Layout title="Index">
      {/* Replace with your content */}
      <div className="py-4">
        <p className="max-w-prose text-gray-600">
          These examples show how to use{" "}
          <code className="text-sm font-mono font-thin">@happykit/flags</code>.
        </p>

        <div className="bg-blue-100 border-l-4 border-blue-400 p-4 md:hidden my-2">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                You can find the examples in the navigation menu.
              </p>
            </div>
          </div>
        </div>

        <p className="max-w-prose text-gray-600 mt-2">
          The examples are intended as reference implementations for the
          different ways in which the{" "}
          <code className="text-sm font-mono font-thin">@happykit/flags</code>{" "}
          client can be used.
        </p>

        <p className="max-w-prose text-gray-600 mt-4">
          You'll see boxes like the one below in each example. These boxes
          contain the value returned by the{" "}
          <code className="text-sm font-mono font-thin">useFlags()</code> hook.
          We usually call this value the "flagBag", as it contains the evaluated
          feature flags and a bunch of other things you might need.
        </p>
        <Result key="index" value={flagBag} />
        <p className="max-w-prose text-gray-600 mt-2">
          The "Previous values" section shows a history of the values the
          useFlags() hook returned.
        </p>
      </div>
    </Layout>
  );
}
