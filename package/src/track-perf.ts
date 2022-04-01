type Options = {
  duration: number;
  location: "client" | "edge" | "ssr" | "ssg";
  envKey: string;
  responseStatusCode: number;
  serverTiming: string | null;
  cfRay: string | null;
};

export function perfContent(options: Options) {
  return JSON.stringify(options);
}

export function trackPerf(options: Options) {
  return fetch(`https://happykit.dev/api/flags-perf`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: perfContent(options),
  }).catch(() => null);
}
