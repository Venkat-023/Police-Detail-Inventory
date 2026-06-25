import { useEffect, useRef, useState } from "react";

export function useAutoSave(enabled: boolean, intervalMs: number, save: () => Promise<void> | void) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(async () => {
      await saveRef.current();
      setLastSaved(new Date());
    }, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);

  return { lastSaved };
}
