import { describe, it, expect } from "vitest";
import {
  STATUS_TRANSITIONS,
  TERMINAL_STATUSES,
  REPORT_STATUS_LABEL,
  REPORT_STATUS_ORDER,
  CITIZEN_STAGE_ORDER,
  toCitizenStage,
  type ReportStatus,
} from "@/lib/types";

const ALL_STATUSES = Object.keys(REPORT_STATUS_LABEL) as ReportStatus[];

describe("status workflow integrity", () => {
  it("has a transition entry for every known status", () => {
    for (const status of ALL_STATUSES) {
      expect(STATUS_TRANSITIONS[status]).toBeDefined();
    }
  });

  it("only references known statuses as transition targets", () => {
    for (const [from, targets] of Object.entries(STATUS_TRANSITIONS)) {
      for (const target of targets) {
        expect(ALL_STATUSES, `${from} -> ${target} references an unknown status`).toContain(target);
      }
    }
  });

  it("terminal statuses have no outgoing transitions", () => {
    for (const status of TERMINAL_STATUSES) {
      expect(STATUS_TRANSITIONS[status]).toEqual([]);
    }
  });

  it("every non-terminal status can reach a terminal status within a few hops", () => {
    for (const status of ALL_STATUSES) {
      if (TERMINAL_STATUSES.includes(status)) continue;

      const seen = new Set<ReportStatus>();
      let frontier = [status];
      let reachedTerminal = false;

      for (let hop = 0; hop < ALL_STATUSES.length && !reachedTerminal; hop++) {
        const next: ReportStatus[] = [];
        for (const s of frontier) {
          if (seen.has(s)) continue;
          seen.add(s);
          if (TERMINAL_STATUSES.includes(s)) {
            reachedTerminal = true;
            break;
          }
          next.push(...(STATUS_TRANSITIONS[s] ?? []));
        }
        frontier = next;
      }

      expect(reachedTerminal, `${status} can never reach a terminal status`).toBe(true);
    }
  });

  it("the happy-path order contains no terminal side-branch statuses", () => {
    for (const status of REPORT_STATUS_ORDER) {
      expect(TERMINAL_STATUSES.includes(status) && status !== "closed").toBe(false);
    }
  });
});

describe("citizen stage mapping", () => {
  it("maps every internal status to a citizen-facing stage", () => {
    for (const status of ALL_STATUSES) {
      expect(CITIZEN_STAGE_ORDER.includes(toCitizenStage(status)) || toCitizenStage(status) === "rejected").toBe(true);
    }
  });

  it("collapses duplicate and rejected to the same non-progress stage", () => {
    expect(toCitizenStage("rejected")).toBe("rejected");
    expect(toCitizenStage("duplicate")).toBe("rejected");
  });

  it("maps closed to the final citizen stage", () => {
    expect(toCitizenStage("closed")).toBe("closed");
    expect(CITIZEN_STAGE_ORDER[CITIZEN_STAGE_ORDER.length - 1]).toBe("closed");
  });
});
