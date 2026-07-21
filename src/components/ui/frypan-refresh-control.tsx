import React from "react";
import { RefreshControl, RefreshControlProps, View } from "react-native";
import { CookingLoader } from "@/components/ui/cooking-loader";

/**
 * Pull-to-refresh trigger with the NATIVE indicator hidden on both platforms —
 * the frypan (CookingLoader) rendered by the screen is the visual indicator,
 * matching the community feed's pattern.
 *
 * Why a native RefreshControl at all? It does the gesture work reliably:
 * Android never reports negative scroll offsets (so offset-based tricks are
 * iOS-only), and iOS keeps its natural "held" overscroll gap while refreshing.
 *
 * Usage:
 *   <ScrollView
 *     refreshControl={<FrypanRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
 *   >
 *     {refreshing && <FrypanRefreshRow />}
 *     ...
 *
 * Keep the refresh handler alive ~1s (Promise.all with a min-wait) so the
 * frypan animation is actually visible.
 */
export function FrypanRefreshControl(props: RefreshControlProps) {
  return (
    <RefreshControl
      tintColor="transparent"
      colors={["transparent"]}
      progressBackgroundColor="transparent"
      {...props}
    />
  );
}

/** The frypan row shown at the top of the list while refreshing. */
export function FrypanRefreshRow() {
  return (
    <View
      style={{
        height: 84,
        alignItems: "center",
        justifyContent: "flex-end",
        overflow: "hidden",
        paddingBottom: 4,
      }}
    >
      <CookingLoader scale={0.5} isAnimating />
    </View>
  );
}
