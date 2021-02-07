import clsx from "clsx";

export function Switch(props: {
  id: string;
  label: string;
  active?: boolean;
  onClick: React.DOMAttributes<HTMLButtonElement>["onClick"];
}) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        aria-pressed={props.active}
        aria-labelledby={props.id}
        onClick={props.onClick}
        className={clsx(
          "bg-gray-200 relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
          props.active ? "bg-indigo-600" : "bg-gray-200"
        )}
      >
        <span className="sr-only">{props.label}</span>
        <span
          aria-hidden="true"
          className={clsx(
            "translate-x-0 pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200",
            props.active ? "translate-x-5" : "translate-x-0"
          )}
        ></span>
      </button>
      <span className="ml-3 flex items-center" id={props.id}>
        <span className="text-sm font-medium text-gray-900">{props.label}</span>
      </span>
    </div>
  );
}
