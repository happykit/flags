import * as React from "react";
import { Nav } from "components/Nav";
import Head from "next/head";
import { Transition } from "@tailwindui/react";
import { FlagBag } from "@happykit/flags/client";

export function Layout(props: {
  title: string;
  source?: string;
  children: React.ReactNode;
  flagBag: FlagBag | null;
}) {
  const [expanded, setExpanded] = React.useState<boolean>(false);

  // has to be done this way to avoid differing output in client and server render
  const [supportsPerformanceMetrics, setSupportsPerformanceMetrics] =
    React.useState<boolean>(false);

  React.useEffect(
    () => setSupportsPerformanceMetrics(typeof performance !== "undefined"),
    []
  );

  const [performanceEntry, setPerformanceEntry] =
    React.useState<null | PerformanceResourceTiming>(null);

  React.useEffect(() => {
    if (typeof performance === "undefined") return;
    if (props.flagBag && props.flagBag.settled) {
      const entries = performance
        .getEntriesByType("resource")
        .filter((entry) => {
          return entry.name.endsWith(
            [
              process.env.NEXT_PUBLIC_FLAGS_ENDPOINT!,
              process.env.NEXT_PUBLIC_FLAGS_ENV_KEY!,
            ].join("/")
          );
        });

      if (entries.length > 0) {
        setPerformanceEntry(
          entries[entries.length - 1] as PerformanceResourceTiming
        );
      }
    }
  }, [props.flagBag]);

  // clear timings so the next page doesn't accidentally load timings
  // of the current page
  React.useEffect(() => {
    if (typeof performance === "undefined") return;

    return () => {
      performance.clearResourceTimings();
      performance.clearMeasures();
      performance.clearMarks();
    };
  }, []);

  // Text has to be extract to a variable to avoid this react error:
  //
  // Warning: A title element received an array with more than 1 element as
  // children. In browsers title Elements can only have Text Nodes as children.
  // If the children being rendered output more than a single text node in
  // aggregate the browser will display markup and comments as text in the title
  // and hydration will likely fail and fall back to client rendering
  const titleText = `${props.title} · HappyKit Flags Documentation`;

  return (
    <React.Fragment>
      <Head>
        <title>{titleText}</title>
      </Head>
      {/* This example requires Tailwind CSS v2.0+ */}
      <div className="h-screen flex overflow-hidden bg-gray-100">
        {/* Off-canvas menu for mobile, show/hide based on off-canvas menu state. */}
        {expanded && (
          <div className="md:hidden">
            <div className="fixed inset-0 flex z-40">
              <Transition
                show={expanded}
                enter="transition-opacity ease-linear duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition-opacity ease-linear duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0">
                  <div className="absolute inset-0 bg-gray-600 opacity-75" />
                </div>
              </Transition>
              <Transition
                show={expanded}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <div className="relative flex-1 flex flex-col max-w-xs w-full h-full bg-white">
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                      onClick={() => setExpanded(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      {/* Heroicon name: outline/x */}
                      <svg
                        className="h-6 w-6 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-shrink-0 flex items-center px-4 pt-5">
                    <img
                      className="h-8 w-auto"
                      src="/logo.svg"
                      alt="HappyKit Logo"
                    />
                  </div>
                  <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                    <nav
                      className="mt-5 flex-1 pl-2 pr-4 space-y-1 bg-white"
                      aria-label="Sidebar"
                    >
                      <Nav />
                    </nav>
                  </div>
                  <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                    <a
                      href="https://github.com/happykit/flags"
                      className="flex-shrink-0 group block"
                    >
                      <div className="flex items-center">
                        <div>
                          <img
                            className="inline-block h-10 w-10 rounded-full"
                            src="/github.svg"
                            alt=""
                          />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-mono font-light text-gray-700 group-hover:text-gray-900">
                            @happykit/flags
                          </p>
                          <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                            Open on GitHub
                          </p>
                        </div>
                      </div>
                    </a>
                  </div>
                </div>
                <div className="flex-shrink-0 w-14">
                  {/* Force sidebar to shrink to fit close icon */}
                </div>
              </Transition>
            </div>
          </div>
        )}{" "}
        {/* Static sidebar for desktop */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-80">
            <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
              <div className="flex items-center flex-shrink-0 px-4 pt-5">
                <img
                  className="h-8 w-auto"
                  src="/logo.svg"
                  alt="HappyKit Logo"
                />
              </div>
              <div className="flex-1 flex flex-col pb-4 overflow-y-auto">
                <div className="mt-3 flex-1 px-2 bg-white space-y-1">
                  <div className="mt-3 flex-grow flex flex-col">
                    <nav
                      className="flex-1 px-2 space-y-1 bg-white"
                      aria-label="Sidebar"
                    >
                      <Nav />
                    </nav>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                <a
                  href="https://github.com/happykit/flags"
                  className="flex-shrink-0 w-full group block"
                >
                  <div className="flex items-center">
                    <div>
                      <img
                        className="inline-block h-9 w-9 rounded-full"
                        src="/github.svg"
                        alt=""
                      />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-mono font-light text-gray-700 group-hover:text-gray-900">
                        @happykit/flags
                      </p>
                      <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                        Open on GitHub
                      </p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
            <button
              className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              type="button"
              onClick={() => setExpanded(true)}
            >
              <span className="sr-only">Open sidebar</span>
              {/* Heroicon name: outline/menu */}
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
          <main
            className="flex-1 relative z-0 overflow-y-auto focus:outline-none flex flex-col min-h-screen"
            tabIndex={0}
          >
            <div className="py-6 max-w-prose flex-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {props.title}
                </h1>
                {props.source && (
                  <div className="mt-4 rounded-md bg-blue-50 border border-blue-200 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        {/* Heroicon name: solid/information-circle */}
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
                      <div className="ml-3">
                        <p className="text-sm text-blue-600">
                          This demo is easiest to understand if you open its
                          source code in a parallel tab.
                        </p>
                        <p className="mt-3 text-sm">
                          <a
                            href={props.source}
                            target="_blank"
                            className="whitespace-nowrap font-medium text-blue-600 hover:text-blue-700"
                          >
                            Source code <span aria-hidden="true">→</span>
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {props.children}
              </div>
            </div>
            {supportsPerformanceMetrics && (
              <div className="bg-gray-100">
                <hr />
                <div className="pt-3 pb-1 font-semibold max-w-7xl mx-auto px-4 sm:px-6 md:px-8 text-gray-500 uppercase tracking-wide text-sm">
                  Performance
                </div>
                {performanceEntry ? (
                  <div className="pb-3 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 text-gray-500 text-sm">
                    The last flag evaluation request took{" "}
                    {Math.floor(performanceEntry.duration)}ms.{" "}
                    {Math.floor(performanceEntry.duration) < 100 && (
                      <React.Fragment>
                        For comparison:{" "}
                        <a
                          href="https://en.wikipedia.org/wiki/Blinking"
                          className="hover:underline"
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          The blink of a human eye takes 100ms
                        </a>
                        .
                      </React.Fragment>
                    )}
                  </div>
                ) : (
                  <div className="pb-3 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 text-gray-500 text-sm">
                    No feature flags loaded by the browser so far.
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </React.Fragment>
  );
}
