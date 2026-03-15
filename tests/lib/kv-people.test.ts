import { describe, it, expect } from "vitest";
import { peopleKey, getKnownPeople, upsertKnownPerson, deleteKnownPerson, type KnownPerson } from "@functions/lib/kv";
import { createMockKV } from "../helpers";

describe("peopleKey", () => {
  it("returns user-scoped key when no chatId provided", () => {
    expect(peopleKey(42)).toBe("user:42:people");
  });

  it("returns chat-scoped key when chatId is provided", () => {
    expect(peopleKey(42, -100123)).toBe("chat:-100123:people");
  });

  it("uses chatId even when it differs from userId", () => {
    expect(peopleKey(1, 9999)).toBe("chat:9999:people");
  });
});

describe("getKnownPeople", () => {
  it("returns empty array when nothing is stored", async () => {
    const { kv } = createMockKV();
    expect(await getKnownPeople(kv, "user:1:people")).toEqual([]);
  });

  it("returns the stored list", async () => {
    const { kv, store } = createMockKV();
    const people: KnownPerson[] = [{ name: "Alice" }, { name: "Bob", telegramId: 7 }];
    store.set("user:1:people", JSON.stringify(people));
    expect(await getKnownPeople(kv, "user:1:people")).toEqual(people);
  });

  it("reads from the exact key provided", async () => {
    const { kv, store } = createMockKV();
    store.set("chat:-999:people", JSON.stringify([{ name: "Charlie" }]));
    expect(await getKnownPeople(kv, "user:1:people")).toEqual([]);
    expect(await getKnownPeople(kv, "chat:-999:people")).toEqual([{ name: "Charlie" }]);
  });
});

describe("upsertKnownPerson", () => {
  it("adds a new person to an empty list", async () => {
    const { kv, store } = createMockKV();
    await upsertKnownPerson(kv, "user:1:people", { name: "Alice" });
    const result = JSON.parse(store.get("user:1:people")!) as KnownPerson[];
    expect(result).toEqual([{ name: "Alice" }]);
  });

  it("prepends new person (most recent first)", async () => {
    const { kv, store } = createMockKV();
    store.set("user:1:people", JSON.stringify([{ name: "Existing" }]));
    await upsertKnownPerson(kv, "user:1:people", { name: "New" });
    const result = JSON.parse(store.get("user:1:people")!) as KnownPerson[];
    expect(result[0].name).toBe("New");
    expect(result[1].name).toBe("Existing");
  });

  it("deduplicates by telegramId — removes old entry and prepends updated one", async () => {
    const { kv, store } = createMockKV();
    store.set("user:1:people", JSON.stringify([
      { name: "Old Name", telegramId: 99 },
      { name: "Bob" },
    ]));
    await upsertKnownPerson(kv, "user:1:people", { name: "New Name", telegramId: 99 });
    const result = JSON.parse(store.get("user:1:people")!) as KnownPerson[];
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: "New Name", telegramId: 99 });
    expect(result[1].name).toBe("Bob");
  });

  it("deduplicates custom (no telegramId) names case-insensitively", async () => {
    const { kv, store } = createMockKV();
    store.set("user:1:people", JSON.stringify([{ name: "alice" }]));
    await upsertKnownPerson(kv, "user:1:people", { name: "Alice" });
    const result = JSON.parse(store.get("user:1:people")!) as KnownPerson[];
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  it("does not deduplicate a custom-name entry against a telegramId entry", async () => {
    const { kv, store } = createMockKV();
    store.set("user:1:people", JSON.stringify([{ name: "Alice" }]));
    // Upserting a telegramId person deduplicates by telegramId only; no match → both kept
    await upsertKnownPerson(kv, "user:1:people", { name: "Alice", telegramId: 5 });
    const result = JSON.parse(store.get("user:1:people")!) as KnownPerson[];
    expect(result).toHaveLength(2);
  });

  it("caps the list at 50 entries, dropping the oldest", async () => {
    const { kv, store } = createMockKV();
    const existing = Array.from({ length: 50 }, (_, i) => ({ name: `Person ${i}` }));
    store.set("user:1:people", JSON.stringify(existing));
    await upsertKnownPerson(kv, "user:1:people", { name: "New" });
    const result = JSON.parse(store.get("user:1:people")!) as KnownPerson[];
    expect(result).toHaveLength(50);
    expect(result[0].name).toBe("New");
    expect(result[49].name).toBe("Person 48"); // "Person 49" (oldest) was dropped
  });

  it("writes to the exact key provided", async () => {
    const { kv, store } = createMockKV();
    await upsertKnownPerson(kv, "chat:-100:people", { name: "Dave" });
    expect(store.has("user:1:people")).toBe(false);
    expect(store.has("chat:-100:people")).toBe(true);
  });
});

describe("deleteKnownPerson", () => {
  it("removes a person by telegramId", async () => {
    const { kv, store } = createMockKV();
    store.set("user:1:people", JSON.stringify([
      { name: "Alice", telegramId: 5 },
      { name: "Bob" },
    ]));
    await deleteKnownPerson(kv, "user:1:people", { name: "Alice", telegramId: 5 });
    const result = JSON.parse(store.get("user:1:people")!) as KnownPerson[];
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Bob");
  });

  it("removes a custom-named person case-insensitively", async () => {
    const { kv, store } = createMockKV();
    store.set("user:1:people", JSON.stringify([
      { name: "Alice" },
      { name: "Bob" },
    ]));
    await deleteKnownPerson(kv, "user:1:people", { name: "alice" });
    const result = JSON.parse(store.get("user:1:people")!) as KnownPerson[];
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Bob");
  });

  it("does not remove a custom-named entry when matching by telegramId", async () => {
    const { kv, store } = createMockKV();
    store.set("user:1:people", JSON.stringify([
      { name: "Alice" },
      { name: "Alice", telegramId: 5 },
    ]));
    // Delete by telegramId — should only remove the telegramId entry
    await deleteKnownPerson(kv, "user:1:people", { name: "Alice", telegramId: 5 });
    const result = JSON.parse(store.get("user:1:people")!) as KnownPerson[];
    expect(result).toHaveLength(1);
    expect(result[0].telegramId).toBeUndefined();
  });
});
