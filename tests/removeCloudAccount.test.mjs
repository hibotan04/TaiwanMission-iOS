import assert from "node:assert/strict";
import test from "node:test";
import { removeCloudAccount } from "../src/app/removeCloudAccount.ts";

function mockCleanup() {
  const events = [];
  return {
    events,
    listPhotos: async () => ["one.jpg", "stale.jpg"],
    deletePhoto: async (photo) => { events.push(photo); },
    deleteDocument: async () => { events.push("document"); },
    deleteAccount: async () => { events.push("auth"); },
  };
}

test("remove cloud-only photos before deleting the document and account", async () => {
  const cleanup = mockCleanup();
  await removeCloudAccount(cleanup);
  assert.deepEqual(cleanup.events, ["one.jpg", "stale.jpg", "document", "auth"]);
});

for (const stage of ["listPhotos", "deletePhoto", "deleteDocument"]) {
  test(`a failure at ${stage} preserves the auth account`, async () => {
    const cleanup = mockCleanup();
    cleanup[stage] = async () => { throw new Error("network"); };
    await assert.rejects(removeCloudAccount(cleanup), /network/);
    assert.ok(!cleanup.events.includes("auth"));
  });
}

test("retry succeeds when another request already removed a listed object", async () => {
  const cleanup = mockCleanup();
  cleanup.deletePhoto = async () => { throw Object.assign(new Error(), { code: "storage/object-not-found" }); };
  await removeCloudAccount(cleanup);
  assert.deepEqual(cleanup.events, ["document", "auth"]);
});

test("auth failure is reported after storage cleanup", async () => {
  const cleanup = mockCleanup();
  cleanup.deleteAccount = async () => { throw new Error("requires-recent-login"); };
  await assert.rejects(removeCloudAccount(cleanup), /requires-recent-login/);
});
