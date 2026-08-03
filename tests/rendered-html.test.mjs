import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the TeamSpend application", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>TeamSpend — Team spending, sorted<\/title>/i);
  assert.match(html, /Good evening/);
  assert.match(html, /Total team spend/);
  assert.match(html, /Add expense/);
  assert.match(html, /Connect Supabase/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("reports demo mode when Supabase is not configured", async () => {
  const response = await render("/api/bootstrap");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { configured: false });
});
