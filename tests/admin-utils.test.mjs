import test from "node:test";
import assert from "node:assert/strict";

import {
  PIPELINE_ORDER,
  computeJobSummary,
  buildDriverLeaderboard,
  computeMembershipSummary,
  identifyStaleThreads,
  computeHealthChecks,
  buildContentUpsertPayload,
  formatAge,
} from "../app/admin/utils.mjs";

test("computeJobSummary groups jobs into pipeline buckets", () => {
  const now = new Date("2025-01-05T12:00:00Z");
  const jobs = [
    { id: "a", status: "open", created_at: "2025-01-05T10:00:00Z" },
    { id: "b", status: "accepted", created_at: "2025-01-05T09:00:00Z" },
    { id: "c", status: "completed", updated_at: "2024-12-31T09:00:00Z" },
    { id: "d", status: "cancelled", created_at: "2024-12-30T09:00:00Z" },
  ];

  const summary = computeJobSummary(jobs, now);

  assert.equal(summary.total, 4);
  PIPELINE_ORDER.forEach((key) => {
    assert.ok(Array.isArray(summary.pipeline[key]));
  });
  assert.equal(summary.byStatus.open, 1);
  assert.equal(summary.byStatus.accepted, 1);
  assert.equal(summary.byStatus.completed, 1);
  assert.equal(summary.byStatus.cancelled, 1);
  assert.equal(summary.aged, 2, "jobs older than 48h are flagged");
});

test("buildDriverLeaderboard aggregates completions and revenue", () => {
  const jobs = [
    { id: "1", status: "completed", price: 100, driver_id: "driver-1" },
    { id: "2", status: "accepted", price: 50, driver_id: "driver-1" },
    { id: "3", status: "completed", price: 80, driver_id: "driver-2" },
    { id: "4", status: "in_transit", price: 70, driver_id: "driver-2" },
  ];
  const profiles = {
    "driver-1": { name: "Alice" },
    "driver-2": { email: "bob@example.com" },
  };

  const leaderboard = buildDriverLeaderboard(jobs, profiles, []);

  assert.equal(leaderboard.length, 2);
  const [first, second] = leaderboard;
  assert.equal(first.name, "Alice");
  assert.equal(first.completed, 1);
  assert.equal(first.active, 1);
  assert.equal(first.revenue, 150);
  assert.equal(second.name, "bob@example.com");
  assert.equal(second.completed, 1);
  assert.equal(second.active, 1);
});

test("computeMembershipSummary tracks plan counts and past-due", () => {
  const subscriptions = [
    { plan_key: "bronze", status: "active" },
    { plan_key: "bronze", status: "past_due" },
    { plan_key: "gold", status: "active" },
  ];

  const summary = computeMembershipSummary(subscriptions);
  assert.equal(summary.total, 3);
  assert.equal(summary.byPlan.bronze, 2);
  assert.equal(summary.byPlan.gold, 1);
  assert.equal(summary.pastDue, 1);
});

test("identifyStaleThreads filters conversations older than 24h", () => {
  const now = new Date("2025-01-05T12:00:00Z");
  const threads = [
    { id: "fresh", last_message_at: "2025-01-05T11:00:00Z" },
    { id: "stale", last_message_at: "2025-01-03T10:00:00Z" },
  ];

  const stale = identifyStaleThreads(threads, now);
  assert.deepEqual(stale.map((t) => t.id), ["stale"]);
});

test("computeHealthChecks surfaces warnings", () => {
  const health = computeHealthChecks({
    jobSummary: { aged: 2 },
    staleThreads: [{ id: "t1" }],
    dealerSummary: { pending: 6 },
    driverSummary: { pending: 3 },
    membershipSummary: { pastDue: 1 },
  });

  const openJobsCheck = health.find((item) => item.label.includes("Open jobs"));
  assert.equal(openJobsCheck.status, "warn");
  const dealerCheck = health.find((item) => item.label.includes("dealer"));
  assert.equal(dealerCheck.status, "warn");
});

test("buildContentUpsertPayload serialises the draft", () => {
  const draft = {
    announcements: ["One", "Two"],
    legalDocs: [{ label: "Terms", url: "/terms.pdf" }],
    featureFlags: { newFeature: true },
  };
  const payload = buildContentUpsertPayload(draft, "2025-01-05T12:00:00Z");
  assert.equal(payload.length, 3);
  assert.equal(payload[0].key, "home_updates");
  assert.equal(payload[1].key, "legal_docs");
  assert.equal(payload[2].key, "feature_flags");
  assert.equal(payload[0].value, JSON.stringify(draft.announcements));
  assert.equal(payload[1].value, JSON.stringify(draft.legalDocs));
  assert.equal(payload[2].value, JSON.stringify(draft.featureFlags));
});

test("formatAge describes recency", () => {
  const now = new Date("2025-01-05T12:00:00Z");
  const early = formatAge("2025-01-05T11:40:00Z", now);
  const dayOld = formatAge("2025-01-04T08:00:00Z", now);
  assert.equal(early.label, "<1h");
  assert.equal(dayOld.label, "1d ago");
});