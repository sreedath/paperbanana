"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { JobStatus } from "@/lib/types";

export function useJobStatus(jobId: string | null, token: string | null) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (!jobId || !token) {
      stop();
      return;
    }

    setIsPolling(true);

    const poll = async () => {
      try {
        const data = await apiFetch<JobStatus>(`/jobs/${jobId}`, token);
        setJob(data);
        if (data.status === "completed" || data.status === "failed") {
          stop();
        }
      } catch {
        stop();
      }
    };

    // Poll immediately, then every 3 seconds
    poll();
    intervalRef.current = setInterval(poll, 3000);

    return stop;
  }, [jobId, token, stop]);

  return { job, isPolling, stop };
}
