export function Content(props: {
  title: string;
  source?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-6 max-w-prose flex-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">{props.title}</h1>
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
                  This demo is easiest to understand if you open its source code
                  in a parallel tab.
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
  );
}
