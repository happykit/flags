import * as React from "react";
import { Layout } from "components/Layout";
import { Result } from "components/Result";
import { RadioGroup } from "@headlessui/react";
import clsx from "clsx";
import { useFlags } from "flags/client";

export default function Page() {
  const users = React.useMemo(
    () => [
      {
        name: "No user",
        description: "Passes no user",
        value: null,
      },
      {
        name: "George",
        description: "Passes a user with the key george",
        value: { key: "george" },
      },
      {
        name: "Linda",
        description: "Passes a user with the key linda",
        value: { key: "linda" },
      },
    ],
    []
  );

  const traits = React.useMemo(
    () => [
      {
        name: "No traits",
        description: "Passes no traits",
        value: null,
      },
      {
        name: "Team Member (yes)",
        description: "Passes teamMember: true as a trait",
        value: { teamMember: true },
      },
      {
        name: "Team Member (no)",
        description: "Passes teamMember: false as a trait",
        value: { teamMember: false },
      },
    ],
    []
  );

  const [user, setUser] = React.useState(users[0]);
  const [trait, setTraits] = React.useState(traits[0]);

  const flagBag = useFlags({
    user: user.value,
    traits: trait.value,
  });

  return (
    <Layout
      title="Dynamic"
      source={`https://github.com/happykit/flags/blob/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/example/pages/demo/dynamics.tsx`}
      flagBag={flagBag}
    >
      <article className="py-4 prose max-w-prose">
        <p>
          This demo shows how the <code>@happykit/flags</code> client behaves
          when the passed in user attributes or traits change.
        </p>
        <p>
          Simulate changing user attributes or traits using the buttons below.
          Explore how the loading state changes throughout the lifecycle.
        </p>
        <p>Use the buttons below to modify the passed in values</p>

        <RadioGroup value={user} onChange={setUser}>
          <RadioGroup.Label className="text-sm font-medium text-gray-900">
            User
          </RadioGroup.Label>

          <div className="mt-1 bg-white rounded-md shadow-sm -space-y-px">
            {users.map((setting, settingIdx) => (
              <RadioGroup.Option
                key={setting.name}
                value={setting}
                className={({ checked }) =>
                  clsx(
                    settingIdx === 0 ? "rounded-tl-md rounded-tr-md" : "",
                    settingIdx === users.length - 1
                      ? "rounded-bl-md rounded-br-md"
                      : "",
                    checked
                      ? "bg-blue-50 border-blue-200 z-10"
                      : "border-gray-200",
                    "relative border p-4 flex cursor-pointer focus:outline-none"
                  )
                }
              >
                {({ active, checked }) => (
                  <React.Fragment>
                    <span
                      className={clsx(
                        checked
                          ? "bg-blue-600 border-transparent"
                          : "bg-white border-gray-300",
                        active ? "ring-2 ring-offset-2 ring-blue-500" : "",
                        "h-4 w-4 mt-0.5 cursor-pointer rounded-full border flex items-center justify-center"
                      )}
                      aria-hidden="true"
                    >
                      <span className="rounded-full bg-white w-1.5 h-1.5" />
                    </span>
                    <div className="ml-3 flex flex-col">
                      <RadioGroup.Label
                        as="span"
                        className={clsx(
                          checked ? "text-blue-900" : "text-gray-900",
                          "block text-sm font-medium"
                        )}
                      >
                        {setting.name}
                      </RadioGroup.Label>
                      <RadioGroup.Description
                        as="span"
                        className={clsx(
                          checked ? "text-blue-700" : "text-gray-500",
                          "block text-sm"
                        )}
                      >
                        {setting.description}
                      </RadioGroup.Description>
                    </div>
                  </React.Fragment>
                )}
              </RadioGroup.Option>
            ))}
          </div>
        </RadioGroup>

        <RadioGroup value={trait} onChange={setTraits} className="mt-3">
          <RadioGroup.Label className="text-sm font-medium text-gray-900">
            Traits
          </RadioGroup.Label>

          <div className="mt-1 bg-white rounded-md shadow-sm -space-y-px">
            {traits.map((setting, settingIdx) => (
              <RadioGroup.Option
                key={setting.name}
                value={setting}
                className={({ checked }) =>
                  clsx(
                    settingIdx === 0 ? "rounded-tl-md rounded-tr-md" : "",
                    settingIdx === traits.length - 1
                      ? "rounded-bl-md rounded-br-md"
                      : "",
                    checked
                      ? "bg-blue-50 border-blue-200 z-10"
                      : "border-gray-200",
                    "relative border p-4 flex cursor-pointer focus:outline-none"
                  )
                }
              >
                {({ active, checked }) => (
                  <React.Fragment>
                    <span
                      className={clsx(
                        checked
                          ? "bg-blue-600 border-transparent"
                          : "bg-white border-gray-300",
                        active ? "ring-2 ring-offset-2 ring-blue-500" : "",
                        "h-4 w-4 mt-0.5 cursor-pointer rounded-full border flex items-center justify-center"
                      )}
                      aria-hidden="true"
                    >
                      <span className="rounded-full bg-white w-1.5 h-1.5" />
                    </span>
                    <div className="ml-3 flex flex-col">
                      <RadioGroup.Label
                        as="span"
                        className={clsx(
                          checked ? "text-blue-900" : "text-gray-900",
                          "block text-sm font-medium"
                        )}
                      >
                        {setting.name}
                      </RadioGroup.Label>
                      <RadioGroup.Description
                        as="span"
                        className={clsx(
                          checked ? "text-blue-700" : "text-gray-500",
                          "block text-sm"
                        )}
                      >
                        {setting.description}
                      </RadioGroup.Description>
                    </div>
                  </React.Fragment>
                )}
              </RadioGroup.Option>
            ))}
          </div>
        </RadioGroup>

        <div className="text-sm font-medium text-gray-900 mt-8">
          Generated Input
        </div>
        <pre className="font-mono rounded bg-gray-200 p-2 text-gray-800">
          useFlags(
          {JSON.stringify({ user: user.value, traits: trait.value }, null, 2)})
        </pre>
        <div className="text-sm font-medium text-gray-900 mt-8">
          Value returned from hook
        </div>
        <Result key="static-site-generation-hybrid" value={flagBag} />
      </article>
    </Layout>
  );
}
