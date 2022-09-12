import { resolveFlagToVariant } from "./resolve-flag-to-variant";
import type { Flag } from "../evaluation-types";

const fakeVariant1 = {
  id: "fake-variant-id-1",
  description: "Fake Description 1",
  name: "Fake Variant 1",
  value: "fake-variant-value-1",
};

const fakeVariant2 = {
  id: "fake-variant-id-2",
  description: "Fake Description 2",
  name: "Fake Variant 2",
  value: "fake-variant-value-2",
};

const fakeVariant3 = {
  id: "fake-variant-id-3",
  description: "Fake Description 3",
  name: "Fake Variant 3",
  value: "fake-variant-value-3",
};

const flag: Flag = {
  id: "fake-id",
  kind: "string",
  slug: "fake-slug",
  projectId: "fake-project-id",
  variants: [fakeVariant1, fakeVariant2, fakeVariant3],
  production: {
    active: false,
    fallthrough: { mode: "variant", variant: "fake-variant-id-1" },
    offVariation: "fake-variant-id-2",
    rules: [],
    targets: {
      "fake-variant-id-1": { values: [] },
      "fake-variant-id-2": { values: [] },
      "fake-variant-id-3": { values: [] },
    },
  },
  development: {
    active: false,
    fallthrough: { mode: "variant", variant: "fake-variant-id-1" },
    offVariation: "fake-variant-id-2",
    rules: [],
    targets: {
      "fake-variant-id-1": { values: [] },
      "fake-variant-id-2": { values: [] },
      "fake-variant-id-3": { values: [] },
    },
  },
  preview: {
    active: false,
    fallthrough: { mode: "variant", variant: "fake-variant-id-1" },
    offVariation: "fake-variant-id-2",
    rules: [],
    targets: {
      "fake-variant-id-1": { values: [] },
      "fake-variant-id-2": { values: [] },
      "fake-variant-id-3": { values: [] },
    },
  },
};

describe("requests from client", () => {
  it("serves the offVariation when flag is turned off", () => {
    expect(
      resolveFlagToVariant({
        visitor: { key: "fake-visitor-id" },
        flag,
        environment: "production",
      })
    ).toEqual({
      id: "fake-variant-id-2",
      description: "Fake Description 2",
      name: "Fake Variant 2",
      value: "fake-variant-value-2",
    });
  });

  it("serves the fallthrough when flag is turned on", () => {
    expect(
      resolveFlagToVariant({
        visitor: { key: "fake-visitor-id" },
        flag: { ...flag, production: { ...flag.production, active: true } },
        environment: "production",
      })
    ).toEqual({
      id: "fake-variant-id-1",
      description: "Fake Description 1",
      name: "Fake Variant 1",
      value: "fake-variant-value-1",
    });
  });

  it("serves a specific variant for a targeted user", () => {
    expect(
      resolveFlagToVariant({
        visitor: { key: "fake-visitor-id" },
        flag: {
          ...flag,
          production: {
            ...flag.production,
            active: true,
            targets: {
              "fake-variant-id-1": { values: [] },
              "fake-variant-id-2": { values: [] },
              "fake-variant-id-3": { values: ["foo", "fake-user-id"] },
            },
          },
        },
        environment: "production",
        user: { key: "fake-user-id" },
      })
    ).toEqual(fakeVariant3);
  });

  describe("rules", () => {
    it("serves a specific variant by rule", () => {
      expect(
        resolveFlagToVariant({
          visitor: { key: "fake-visitor-id" },
          flag: {
            ...flag,
            production: {
              ...flag.production,
              active: true,
              rules: [
                {
                  id: "fake-rule-id-1",
                  conditions: [
                    {
                      id: "fake-condition-id-1",
                      group: "user",
                      lhs: "key",
                      operator: "equal-to",
                      rhs: "fake-user-id",
                    },
                  ],
                  resolution: { mode: "variant", variant: "fake-variant-id-3" },
                },
              ],
            },
          },
          environment: "production",
          user: { key: "fake-user-id" },
        })
      ).toEqual(fakeVariant3);
    });

    it("serves a specific variant by user email rule", () => {
      expect(
        resolveFlagToVariant({
          visitor: { key: "fake-visitor-id" },
          user: {
            key: "fake-user-id",
            email: "test@foo.com",
          },
          environment: "production",
          flag: {
            ...flag,
            production: {
              ...flag.production,
              active: true,
              rules: [
                {
                  id: "fake-rule-id-1",
                  conditions: [
                    {
                      id: "fake-condition-id-1",
                      group: "user",
                      lhs: "email",
                      operator: "ends-with",
                      rhs: "foo.com",
                    },
                  ],
                  resolution: {
                    mode: "variant",
                    variant: "fake-variant-id-3",
                  },
                },
              ],
            },
          },
        })
      ).toEqual(fakeVariant3);
    });
  });

  describe("fallthrough percentage rollouts", () => {
    it("does a rollout by visitor key", () => {
      expect(
        resolveFlagToVariant({
          visitor: { key: "fake-visitor-id" },
          flag: {
            ...flag,
            production: {
              ...flag.production,
              active: true,
              fallthrough: {
                mode: "rollout",
                bucketByCategory: "visitor",
                variants: {
                  // murmur number for this visitor key + flag id is 6161
                  // which is 61.61, so we make variant 1 go to 61.60
                  // and expect it to get bucketed into the tiny variant 2
                  [fakeVariant1.id]: { weight: 61.61 },
                  [fakeVariant2.id]: { weight: 0.01 },
                  [fakeVariant3.id]: { weight: 38.38 },
                },
              },
            },
          },
          environment: "production",
          user: { key: "fake-user-id" },
        })
      ).toEqual(fakeVariant2);
    });
  });
});
