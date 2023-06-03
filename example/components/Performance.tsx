"use client";
import * as React from "react";
import type { FlagBag } from "@happykit/flags/client";

export function Performance(props: { flagBag: FlagBag | null }) {
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

  if (!supportsPerformanceMetrics) return null;
  return (
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
  );
}
