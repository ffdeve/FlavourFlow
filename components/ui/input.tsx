import { cn } from "@/lib/utils";
import React from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  inputClassName?: string;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  containerClassName,
  inputClassName,
  className,
  onRightIconPress,
  ...props
}: InputProps) {
  return (
    <View className={cn("w-full", containerClassName)}>
      {label && (
        <Text className="text-sm font-medium text-text mb-2">{label}</Text>
      )}

      <View
        className={cn(
          "flex-row items-center bg-interactive border rounded-lg px-3",
          error ? "border-error" : "border-interactive-dark",
        )}
      >
        {leftIcon && <View className="mr-2">{leftIcon}</View>}

        <TextInput
          className={cn(
            "flex-1 py-3 text-base text-text",
            inputClassName,
            className,
          )}
          placeholderTextColor="#8B7D6F"
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            className="ml-2"
            disabled={!onRightIconPress}
          >
            <View>{rightIcon}</View>
          </TouchableOpacity>
        )}
      </View>

      {error && <Text className="text-sm text-error mt-1">{error}</Text>}
    </View>
  );
}
