import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const upload = require("../middleware/uploadMiddleware");

describe("uploadMiddleware (course/lesson thumbnail+video allow-list)", () => {
  const runFilter = (file) => {
    const cb = vi.fn();
    upload.fileFilter({}, file, cb);
    return cb;
  };

  it("accepts a JPEG thumbnail", () => {
    const cb = runFilter({ fieldname: "thumbnail", mimetype: "image/jpeg" });
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it("accepts a PNG, WEBP, or GIF thumbnail", () => {
    for (const mimetype of ["image/png", "image/webp", "image/gif"]) {
      const cb = runFilter({ fieldname: "thumbnail", mimetype });
      expect(cb).toHaveBeenCalledWith(null, true);
    }
  });

  it("rejects a non-image file on the thumbnail field", () => {
    const cb = runFilter({ fieldname: "thumbnail", mimetype: "text/html" });
    expect(cb).toHaveBeenCalledWith(expect.any(Error));
    expect(cb.mock.calls[0][0].message).toMatch(/image/i);
  });

  it("accepts an MP4/WEBM/QuickTime file on the video field", () => {
    for (const mimetype of ["video/mp4", "video/webm", "video/quicktime"]) {
      const cb = runFilter({ fieldname: "video", mimetype });
      expect(cb).toHaveBeenCalledWith(null, true);
    }
  });

  it("rejects a non-video file on the video field, even if it's an allowed image type", () => {
    const cb = runFilter({ fieldname: "video", mimetype: "image/jpeg" });
    expect(cb).toHaveBeenCalledWith(expect.any(Error));
    expect(cb.mock.calls[0][0].message).toMatch(/video/i);
  });

  it("rejects an SVG/HTML upload that could carry stored XSS if served back out of /uploads", () => {
    const cb = runFilter({ fieldname: "thumbnail", mimetype: "image/svg+xml" });
    expect(cb).toHaveBeenCalledWith(expect.any(Error));
  });
});
