import { useEffect, useMemo, useRef, useState } from "react";
import { createBill, getBill, patchBill, type BillPayload } from "./api";
import type { useExpenseStore } from "./useExpenseStore";

type Store = ReturnType<typeof useExpenseStore>;

function storeSnapshot(store: Store): BillPayload {
  return {
    receiptTitle: store.receiptTitle,
    expenses: store.expenses,
    manualTotal: store.manualTotal,
    people: store.people,
    assignments: store.assignments,
    splitMode: store.splitMode,
    currency: store.currency,
  };
}

interface UseBillSyncOptions {
  store: Store;
  onBillLoaded: (bill: BillPayload) => void;
}

export function useBillSync({ store, onBillLoaded }: UseBillSyncOptions) {
  const [billId, setBillId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const versionRef = useRef(0);
  const loadedFromServerRef = useRef(false);
  const billIdRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storeRef = useRef(store);
  const onBillLoadedRef = useRef(onBillLoaded);

  // Keep refs in sync on every render without scheduling effects
  storeRef.current = store;
  onBillLoadedRef.current = onBillLoaded;

  // Mount: initialize bill from URL or create new
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.initData) return; // standalone browser mode

    const urlBillId = new URLSearchParams(window.location.search).get("billId");
    const tgUser = tg.initDataUnsafe?.user;
    let mounted = true;

    setLoading(true);

    function startPolling(id: string) {
      intervalRef.current = setInterval(async () => {
        try {
          const bill = await getBill(id);
          if (!mounted) return;
          if (bill.version > versionRef.current) {
            loadedFromServerRef.current = true;
            versionRef.current = bill.version;
            onBillLoadedRef.current(bill);
          }
        } catch {
          // ignore transient poll errors
        }
      }, 4000);
    }

    if (urlBillId) {
      getBill(urlBillId)
        .then((bill) => {
          if (!mounted) return;
          loadedFromServerRef.current = true;
          onBillLoadedRef.current(bill);
          versionRef.current = bill.version;
          billIdRef.current = urlBillId;
          setBillId(urlBillId);
          setIsCreator(tgUser ? bill.creatorTelegramId === tgUser.id : false);
          setLoading(false);
          startPolling(urlBillId);
        })
        .catch((err: Error) => {
          if (!mounted) return;
          setError(err.message);
          setLoading(false);
        });
    } else {
      createBill(storeSnapshot(storeRef.current))
        .then(({ billId: newId }) => {
          if (!mounted) return;
          billIdRef.current = newId;
          setBillId(newId);
          setIsCreator(true);
          versionRef.current = 1;
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set("billId", newId);
          window.history.replaceState({}, "", newUrl.toString());
          setLoading(false);
          startPolling(newId);
        })
        .catch((err: Error) => {
          if (!mounted) return;
          setError(err.message);
          setLoading(false);
        });
    }

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced write on store changes
  const snapshotKey = useMemo(
    () => JSON.stringify(storeSnapshot(store)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.receiptTitle, store.expenses, store.manualTotal, store.people, store.assignments, store.splitMode, store.currency],
  );

  useEffect(() => {
    if (loading) return;
    if (!billIdRef.current) return;

    if (loadedFromServerRef.current) {
      loadedFromServerRef.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!billIdRef.current) return;
      setSaveStatus("saving");
      try {
        const bill = await patchBill(billIdRef.current, storeSnapshot(storeRef.current));
        versionRef.current = bill.version;
        setSaveStatus("saved");
        if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
        saveStatusTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
      }
    }, 500);
  }, [snapshotKey, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return { billId, loading, error, isCreator, saveStatus };
}
