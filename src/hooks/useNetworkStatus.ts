import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable:
          state.isInternetReachable ?? (state.isConnected ?? false),
      });
    });
    return () => unsubscribe();
  }, []);

  return status;
}
