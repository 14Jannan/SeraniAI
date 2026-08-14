import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const upload = require("../middleware/chatUploadMiddleware");

describe("chatUploadMiddleware (chat attachment allow-list)", () => {
  const runFilter = (mimetype) => {
    const cb = vi.fn();
    upload.fileFilter({}, { mimetype }, cb);
    return cb;
  };

  it("accepts a PDF, matching the .pdf option in the chat attachment picker", () => {
    const cb = runFilter("application/pdf");
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it("accepts a plain text file, matching the .txt option in the chat attachment picker", () => {
    const cb = runFilter("text/plain");
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it("rejects an HTML upload that could be served back out of /uploads as stored XSS", () => {
    const cb = runFilter("text/html");
    expect(cb).toHaveBeenCalledWith(expect.any(Error));
  });

  it("rejects an executable/binary upload", () => {
    const cb = runFilter("application/x-msdownload");
    expect(cb).toHaveBeenCalledWith(expect.any(Error));
  });
});
