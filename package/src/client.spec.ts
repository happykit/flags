/**
 * @jest-environment jsdom
 */
import * as React from "react";
import "@testing-library/jest-dom/extend-expect";
import "@testing-library/jest-dom";
import "jest-fetch-mock";
import { useFlags } from "./client";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { renderHook } from "@testing-library/react-hooks";

beforeEach(() => {
  fetchMock.resetMocks();
  window.localStorage.removeItem("happykit_flags");
});

describe("exports", () => {
  it("exports a useFlags hook", () => {
    expect(typeof useFlags).toBe("function");
  });
});
