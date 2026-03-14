import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { safeParse } from "valibot";
import { createBill, getBill, patchBill, isWebAuthenticated, type BillPayload } from "./api";
import { billKeys } from "./queryKeys";
import { useBillStore, BillSchema } from "./store";

function storeSnapshot(): BillPayload {
  const s = useBillStore.getState();
  return {
    receiptTitle: s.receiptTitle,
    expenses: s.expenses,
    manualTotal: s.manualTotal,
    people: s.people,
    assignments: s.assignments,
    splitMode: s.splitMode,
    currency: s.currency,
  };
}

export function useBillSync() {
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
  const queryClient = useQueryClient();

  // Mount: create new bill if no billId in URL
  useEffect(() => {
    if (!isAuthenticated) return;
    if (billId) { setLoading(false); return; } // useQuery handles existing bill

    let mounted = true;
    setLoading(true);
    createBill(storeSnapshot())
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
    const result = safeParse(BillSchema, remoteBill);
    if (!result.success) {
      setError("Bill data is invalid — please reload");
      return;
    }
    loadedFromServerRef.current = true;
    versionRef.current = result.output.version;
    if (!isCreatorSetRef.current) {
      isCreatorSetRef.current = true;
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      setIsCreator(tgUser ? result.output.creatorTelegramId === tgUser.id : false);
    }
    setLoading(false);
    useBillStore.getState().loadBill(result.output);
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

  // Subscribe to relevant store slices for debounced save
  const receiptTitle = useBillStore((s) => s.receiptTitle);
  const expenses = useBillStore((s) => s.expenses);
  const manualTotal = useBillStore((s) => s.manualTotal);
  const people = useBillStore((s) => s.people);
  const assignments = useBillStore((s) => s.assignments);
  const splitMode = useBillStore((s) => s.splitMode);
  const currency = useBillStore((s) => s.currency);

  const snapshotKey = useMemo(
    () => JSON.stringify({ receiptTitle, expenses, manualTotal, people, assignments, splitMode, currency }),
    [receiptTitle, expenses, manualTotal, people, assignments, splitMode, currency],
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
      patchMutation.mutate(storeSnapshot());
    }, 500);
  }, [snapshotKey, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadingFromUrl = !!billId && isRemotePending && !remoteBill;
  return { billId, loading: loading || loadingFromUrl, error, isCreator, saveStatus };
}
