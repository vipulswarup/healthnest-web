'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from '@/lib/auth/client';

export type HouseholdSummary = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ActiveHouseholdState = {
  householdId: string | null;
  households: HouseholdSummary[];
  loading: boolean;
  refresh: () => Promise<void>;
  hydrate: (next: { householdId: string | null; households: HouseholdSummary[] }) => void;
  setActive: (householdId: string) => Promise<void>;
};

const HouseholdContext = createContext<ActiveHouseholdState | null>(null);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [households, setHouseholds] = useState<HouseholdSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback((next: { householdId: string | null; households: HouseholdSummary[] }) => {
    setHouseholdId(next.householdId);
    setHouseholds(next.households);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [activeRes, listRes] = await Promise.all([
        fetch('/api/me/active-household'),
        fetch('/api/households'),
      ]);
      if (listRes.ok) {
        const list = await listRes.json();
        setHouseholds(list);
      }
      if (activeRes.ok) {
        const active = await activeRes.json();
        setHouseholdId(active.householdId ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const setActive = useCallback(async (next: string) => {
    const res = await fetch('/api/me/active-household', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ householdId: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to switch household');
    }
    setHouseholdId(next);
    window.dispatchEvent(new CustomEvent('household-context-changed', { detail: { householdId: next } }));
  }, []);

  const value = useMemo(
    () => ({ householdId, households, loading, refresh, hydrate, setActive }),
    [householdId, households, hydrate, loading, refresh, setActive],
  );

  const skipSessionLoad = pathname === '/dashboard' || pathname.startsWith('/auth/');

  return (
    <HouseholdContext.Provider value={value}>
      {!skipSessionLoad && (
        <HouseholdSessionLoader
          householdId={householdId}
          householdsLength={households.length}
          refresh={refresh}
        />
      )}
      {children}
    </HouseholdContext.Provider>
  );
}

function HouseholdSessionLoader({
  householdId,
  householdsLength,
  refresh,
}: {
  householdId: string | null;
  householdsLength: number;
  refresh: () => Promise<void>;
}) {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (householdId !== null || householdsLength > 0) return;
    void refresh();
  }, [householdId, householdsLength, refresh, status]);

  return null;
}

export function useHouseholdContext(): ActiveHouseholdState {
  const context = useContext(HouseholdContext);
  if (!context) throw new Error('useHouseholdContext must be used within HouseholdProvider');
  return context;
}
