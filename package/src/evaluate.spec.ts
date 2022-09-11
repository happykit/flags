import { Flag } from "./api-route-types";
import { unstable_evaluate } from "./evaluate";

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
  description: "fake-description",
  kind: "string",
  slug: "fake-slug",
  createdAt: "2021-01-20T21:58:31.292434Z",
  updatedAt: "2021-01-20T21:58:31.292434Z",
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

// more in-depth tests are in resolve-flag-to-variant.spec.ts
describe("evaluate", () => {
  it("should be a function", () => {
    expect(typeof unstable_evaluate).toEqual("function");
  });

  it("evaluates flags", () => {
    expect(
      unstable_evaluate({
        flags: [flag],
        environment: "production",
        user: null,
        visitor: null,
        traits: null,
      })
    ).toEqual({
      "fake-slug": {
        description: "Fake Description 2",
        id: "fake-variant-id-2",
        name: "Fake Variant 2",
        value: "fake-variant-value-2",
      },
    });
  });
});
