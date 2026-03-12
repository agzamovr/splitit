import { beforeEach, describe, it, expect } from "vitest";
import { useBillStore } from "../src/store";

beforeEach(() => {
  useBillStore.setState(useBillStore.getInitialState());
});

describe("applyParsedReceipt", () => {
  it("sets manualTotal and clears expenses when receipt has no items", () => {
    // Seed some existing expenses so we can confirm they're cleared
    useBillStore.getState().addExpense();
    useBillStore.getState().applyParsedReceipt({ manualTotal: "42.50", receiptTitle: "Lunch" });
    const { expenses, assignments, manualTotal, receiptTitle } = useBillStore.getState();
    expect(expenses).toEqual([]);
    expect(assignments).toEqual({});
    expect(manualTotal).toBe("42.50");
    expect(receiptTitle).toBe("Lunch");
  });
});

describe("setSplitMode", () => {
  it("pre-fills person amounts from computed split when switching to amounts mode", () => {
    useBillStore.getState().addPerson({ name: "Alice" });
    useBillStore.getState().addPerson({ name: "Bob" });
    useBillStore.setState({ manualTotal: "100" });
    useBillStore.getState().setSplitMode("amounts");
    const { people } = useBillStore.getState();
    expect(people[0].amount).toBe("50.00");
    expect(people[1].amount).toBe("50.00");
  });
});
