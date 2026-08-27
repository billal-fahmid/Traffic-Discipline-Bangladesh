import { describe, it, expect } from "vitest";
import {
  isAcceptedMimeType,
  evidenceTypeFromMime,
  isPathForReport,
  MAX_EVIDENCE_FILE_SIZE_BYTES,
} from "@/lib/file-validation";

describe("file-validation", () => {
  it("accepts the documented evidence mime types", () => {
    expect(isAcceptedMimeType("image/jpeg")).toBe(true);
    expect(isAcceptedMimeType("image/png")).toBe(true);
    expect(isAcceptedMimeType("video/mp4")).toBe(true);
  });

  it("rejects unlisted or executable mime types", () => {
    expect(isAcceptedMimeType("application/x-msdownload")).toBe(false);
    expect(isAcceptedMimeType("text/html")).toBe(false);
    expect(isAcceptedMimeType("application/javascript")).toBe(false);
    expect(isAcceptedMimeType("")).toBe(false);
  });

  it("classifies photo vs video from mime type", () => {
    expect(evidenceTypeFromMime("image/png")).toBe("photo");
    expect(evidenceTypeFromMime("video/mp4")).toBe("video");
  });

  it("has a sane max file size (not unbounded)", () => {
    expect(MAX_EVIDENCE_FILE_SIZE_BYTES).toBeGreaterThan(0);
    expect(MAX_EVIDENCE_FILE_SIZE_BYTES).toBeLessThanOrEqual(100 * 1024 * 1024);
  });

  describe("isPathForReport (IDOR guard)", () => {
    const reportId = "11111111-1111-1111-1111-111111111111";
    const otherReportId = "22222222-2222-2222-2222-222222222222";

    it("accepts a path that belongs to the report", () => {
      expect(isPathForReport(`${reportId}/abc123.jpg`, reportId)).toBe(true);
    });

    it("rejects a path belonging to a different report", () => {
      expect(isPathForReport(`${otherReportId}/abc123.jpg`, reportId)).toBe(false);
    });

    it("rejects path traversal attempts", () => {
      expect(isPathForReport(`${reportId}/../${otherReportId}/secret.jpg`, reportId)).toBe(false);
      expect(isPathForReport(`../../etc/passwd`, reportId)).toBe(false);
    });

    it("rejects paths with no report-id prefix at all", () => {
      expect(isPathForReport("random-file.jpg", reportId)).toBe(false);
    });
  });
});
