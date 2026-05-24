"use client";

import { useEffect, useState } from "react";
import { checkRpcHealth } from "@/actions/admin/check-rpc-health";

interface RpcHealthState {
  checked: boolean;
  healthy: boolean | null;
  blockNumber?: number;
  error?: string;
}

export function useRpcHealth() {
  const [state, setState] = useState<RpcHealthState>({
    checked: false,
    healthy: null,
  });

  useEffect(() => {
    checkRpcHealth().then((result) => {
      setState({
        checked: true,
        healthy: result.healthy,
        blockNumber: result.blockNumber,
        error: result.error,
      });
    });
  }, []);

  return state;
}
