import {
  createReadHandler,
  type DefinitionsInEdgeConfig,
} from "@happykit/flags/api-route";

export const config = { runtime: "experimental-edge" };

const definitions: DefinitionsInEdgeConfig = {
  flags: [
    {
      projectId: "289861443285680649",
      createdAt: "2021-04-08T03:57:29.793369Z",
      updatedAt: "2022-05-16T05:10:33.889791Z",
      slug: "ads",
      description: "A basic flag that is either on or off",
      kind: "boolean",
      production: {
        active: true,
        fallthrough: { variant: "on", mode: "variant" },
        offVariation: "off",
        targets: { on: { values: [] }, off: { values: ["fake-user-key-1"] } },
        rules: [],
      },
      preview: {
        active: true,
        fallthrough: { variant: "on", mode: "variant" },
        offVariation: "off",
        targets: { on: { values: [] }, off: { values: [] } },
        rules: [],
      },
      development: {
        active: true,
        fallthrough: { variant: "on", mode: "variant" },
        offVariation: "off",
        targets: { on: { values: [] }, off: { values: [] } },
        rules: [],
      },
      variants: [
        { id: "on", name: "True", description: "", value: true },
        { id: "off", name: "False", description: "", value: false },
      ],
      id: "295274178068611592",
    },
    {
      projectId: "289861443285680649",
      createdAt: "2021-04-08T03:58:34.135715Z",
      updatedAt: "2021-06-25T09:26:52.398360Z",
      slug: "checkout",
      description: "",
      kind: "string",
      production: {
        active: true,
        fallthrough: {
          variant: "on",
          mode: "rollout",
          bucketByCategory: "visitor",
          variants: {
            on: { weight: 33.333 },
            off: { weight: 33.333 },
            "1617854290624": { weight: 33.334 },
          },
        },
        offVariation: "off",
        targets: {
          on: { values: [] },
          off: { values: [] },
          "1617854290624": { values: [] },
        },
        rules: [],
      },
      preview: {
        active: true,
        fallthrough: { variant: "on", mode: "variant" },
        offVariation: "off",
        targets: {
          on: { values: [] },
          off: { values: [] },
          "1617854290624": { values: [] },
        },
        rules: [],
      },
      development: {
        active: true,
        fallthrough: { variant: "on", mode: "variant" },
        offVariation: "off",
        targets: {
          on: { values: [] },
          off: { values: [] },
          "1617854290624": { values: [] },
        },
        rules: [],
      },
      variants: [
        { id: "on", name: "", description: "", value: "short" },
        { id: "off", name: "", description: "", value: "medium" },
        { id: "1617854290624", name: "", description: "", value: "full" },
      ],
      id: "295274245561254408",
    },
    {
      projectId: "289861443285680649",
      createdAt: "2021-04-08T03:59:36.371068Z",
      updatedAt: "2021-11-24T20:59:10.161592Z",
      slug: "discount",
      description: "",
      kind: "number",
      production: {
        active: true,
        fallthrough: { variant: "on", mode: "variant" },
        offVariation: "on",
        targets: {
          on: { values: [] },
          off: { values: [] },
          "1617854357561": { values: [] },
        },
        rules: [
          {
            id: "oMNlkTtA-I4jFkRwaKgIU",
            conditions: [
              {
                id: "LXHlYix0C3aCh9EtZVlXk",
                group: "user",
                lhs: "authentication",
                operator: "authenticated",
              },
              {
                id: "o5vHObjnJH2slJqDJDtUR",
                group: "user",
                lhs: "email",
                operator: "set",
              },
            ],
            resolution: { mode: "variant", variant: "1617854357561" },
          },
          {
            id: "3Li86bZgV4uTpFsWDkDlU",
            conditions: [
              {
                id: "1btc-0Eq5RAcPqqGTdBHh",
                group: "user",
                lhs: "authentication",
                operator: "authenticated",
              },
            ],
            resolution: { mode: "variant", variant: "off" },
          },
          {
            id: "1VrRKdob1ePVnVz-n7rOR",
            conditions: [
              {
                id: "KEiNK20ooDWnw-W5-yd-p",
                group: "traits",
                lhs: "teamMember",
                operator: "equal-to",
                rhs: "true",
              },
            ],
            resolution: { mode: "variant", variant: "1617854357561" },
          },
        ],
      },
      preview: {
        active: true,
        fallthrough: { variant: "on", mode: "variant" },
        offVariation: "on",
        targets: {
          on: { values: [] },
          off: { values: [] },
          "1617854357561": { values: [] },
        },
        rules: [],
      },
      development: {
        active: true,
        fallthrough: { variant: "on", mode: "variant" },
        offVariation: "off",
        targets: {
          on: { values: [] },
          off: { values: [] },
          "1617854357561": { values: [] },
        },
        rules: [],
      },
      variants: [
        { id: "on", name: "low", description: "", value: 5 },
        { id: "off", name: "medium", description: "", value: 10 },
        { id: "1617854357561", name: "high", description: "", value: 15 },
      ],
      id: "295274310797361677",
    },
    {
      projectId: "289861443285680649",
      createdAt: "2021-04-09T15:38:54.705978Z",
      updatedAt: "2021-09-13T19:14:50.429059Z",
      slug: "purchaseButtonLabel",
      description: "",
      kind: "string",
      production: {
        active: true,
        fallthrough: {
          variant: "on",
          mode: "rollout",
          bucketByCategory: "visitor",
          variants: {
            on: { weight: 25 },
            off: { weight: 25 },
            "1617982706033": { weight: 25 },
            "1617982711642": { weight: 25 },
            LDBpWwqhNoYUCS_p_tyMn: { weight: 0 },
          },
        },
        offVariation: "off",
        targets: {
          on: { values: [] },
          off: { values: [] },
          "1617982706033": { values: [] },
          "1617982711642": { values: [] },
          LDBpWwqhNoYUCS_p_tyMn: { values: [] },
        },
        rules: [],
      },
      preview: {
        active: true,
        fallthrough: { variant: "on", mode: "variant" },
        offVariation: "off",
        targets: {
          on: { values: [] },
          off: { values: [] },
          "1617982706033": { values: [] },
          "1617982711642": { values: [] },
        },
        rules: [],
      },
      development: {
        active: true,
        fallthrough: { variant: "on", mode: "variant" },
        offVariation: "off",
        targets: {
          on: { values: [] },
          off: { values: [] },
          "1617982706033": { values: [] },
          "1617982711642": { values: [] },
        },
        rules: [],
      },
      variants: [
        { id: "on", name: "purchase", description: "", value: "Purchase" },
        { id: "off", name: "buy now", description: "", value: "Buy now" },
        {
          id: "1617982706033",
          name: "add to cart",
          description: "",
          value: "Add to cart",
        },
        {
          id: "1617982711642",
          name: "get it",
          description: "",
          value: "Get it",
        },
      ],
      id: "295408904292008461",
    },
  ],
  revision: "331789352553153107",
};

export default createReadHandler({
  async getDefinitions(projectId, envKey, environment) {
    return definitions;
  },
});
