import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createBill, getBill, patchBill, isWebAuthenticated, type BillPayload } from "./api";
import { billKeys } from "./queryKeys";
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
  const isAuthenticated = !!window.Telegram?.WebApp?.initData || isWebAuthenticated();
  const [billId, setBillId] = useState<string | null>(() => {
    if (!window.Telegram?.WebApp?.initData && !isWebAuthenticated()) return null;
    return new URLSearchParams(window.location.search).get("billId");
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const versionRef = useRef(0);
  const loadedFromServerRef = useRef(false);
  const isCreatorSetRef = useRef(false);
  const billIdRef = useRef<string | null>(billId);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storeRef = useRef(store);
  const onBillLoadedRef = useRef(onBillLoaded);
  const queryClient = useQueryClient();

  // Keep refs in sync on every render without scheduling effects
  storeRef.current = store;
  onBillLoadedRef.current = onBillLoaded;

  // Mount: create new bill if no billId in URL
  useEffect(() => {
    if (!isAuthenticated) return;
    if (billId) { setLoading(false); return; } // useQuery handles existing bill

    let mounted = true;
    setLoading(true);
    createBill(storeSnapshot(storeRef.current))
      .then(({ billId: newId }) => {
        if (!mounted) return;
        billIdRef.current = newId;
        setBillId(newId);
        setIsCreator(true);
        isCreatorSetRef.current = true;
        versionRef.current = 1;
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("billId", newId);
        window.history.replaceState({}, "", newUrl.toString());
        setLoading(false);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      mounted = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for remote updates via TanStack Query
  const { data: remoteBill, isPending: isRemotePending } = useQuery({
    queryKey: billKeys.detail(billId ?? ""),
    queryFn: () => getBill(billId!),
    enabled: !!billId && isAuthenticated,
    refetchInterval: 4000,
    staleTime: 0,
  });

  // React to remote bill updates
  useEffect(() => {
    if (!remoteBill) return;
    if (remoteBill.version <= versionRef.current) return;
    loadedFromServerRef.current = true;
    versionRef.current = remoteBill.version;
    if (!isCreatorSetRef.current) {
      isCreatorSetRef.current = true;
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      setIsCreator(tgUser ? remoteBill.creatorTelegramId === tgUser.id : false);
    }
    setLoading(false);
    onBillLoadedRef.current(remoteBill);
  }, [remoteBill]);

  const patchMutation = useMutation({
    mutationFn: (payload: BillPayload) => patchBill(billIdRef.current!, payload),
    onSuccess: (bill) => {
      versionRef.current = bill.version;
      queryClient.setQueryData(billKeys.detail(billIdRef.current!), bill);
      setSaveStatus("saved");
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: () => setSaveStatus("error"),
  });

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
    debounceRef.current = setTimeout(() => {
      if (!billIdRef.current) return;
      setSaveStatus("saving");
      patchMutation.mutate(storeSnapshot(storeRef.current));
    }, 500);
  }, [snapshotKey, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadingFromUrl = !!billId && isRemotePending && !remoteBill;
  return { billId, loading: loading || loadingFromUrl, error, isCreator, saveStatus };
}
