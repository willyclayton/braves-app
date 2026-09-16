import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { divisions as snapshot } from '@/data/braves';
import type { DivisionBoard } from '@/data/types';
import { fetchLiveDivisions } from '@/lib/standingsLive';

const POLL_MS = 60_000;

/** Live MLB standings, falling back to the last synced snapshot. */
export function useLiveDivisions(): DivisionBoard[] {
  const [boards, setBoards] = useState<DivisionBoard[]>(snapshot);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const live = await fetchLiveDivisions();
        if (!cancelled && live.length) setBoards(live);
      } catch {
        /* keep snapshot or last successful live boards */
      }
    };

    load();
    const timer = setInterval(load, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });

    return () => {
      cancelled = true;
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  return boards;
}
