import { cn } from "@/utils";

import { View, type ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <View
      className={cn(
        "bg-white rounded-lg p-4 shadow-sm",
        "border border-gray-200",
        className,
      )}
      {...props}
    >
      {children}
    </View>
  );
}
