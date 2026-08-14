import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const mongoose = require("mongoose");
const dbConnect = require("../config/dbConnect");

describe("dbConnect", () => {
  let exitSpy;
  let errorSpy;

  beforeEach(() => {
    vi.restoreAllMocks();
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("connects successfully without exiting the process", async () => {
    vi.spyOn(mongoose, "connect").mockResolvedValue({
      connection: { host: "cluster0.mongodb.net", name: "seraniai" },
    });

    await dbConnect();

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("SECURITY/RELIABILITY: exits the process on a failed initial connection instead of booting with no DB", async () => {
    vi.spyOn(mongoose, "connect").mockRejectedValue(new Error("ECONNREFUSED"));

    await dbConnect();

    expect(errorSpy).toHaveBeenCalledWith(
      "Database connection failed:",
      "ECONNREFUSED",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
