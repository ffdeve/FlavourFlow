import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React, { useRef, useState } from "react";
import { Keyboard, Pressable, TextInput, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface AnimatedSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function AnimatedSearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
}: AnimatedSearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<TextInput>(null);
  
  // Reanimated shared values
  const widthVal = useSharedValue(44); // Initial collapsed icon width (w-11)
  
  const handlePress = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      widthVal.value = withSpring(280, { damping: 15 });
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleBlur = () => {
    if (value === "") {
      setIsExpanded(false);
      widthVal.value = withSpring(44, { damping: 15 });
      Keyboard.dismiss();
    }
  };

  const handleClear = () => {
    onChangeText("");
    inputRef.current?.focus();
  };

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      width: widthVal.value,
    };
  });

  return (
    <View className="items-center justify-center h-12 w-full my-2">
      <Animated.View
        style={[animatedContainerStyle]}
        className="h-11 flex-row items-center bg-black/5 rounded-full overflow-hidden relative"
      >
        {/* Search Icon Button */}
        <Pressable
          onPress={handlePress}
          className="w-11 h-11 bg-primary rounded-full items-center justify-center z-10"
        >
          <FontAwesome6 name="magnifying-glass" size={16} color="white" />
        </Pressable>

        {/* Text Input (fades in/out) */}
        {isExpanded && (
          <View className="flex-1 flex-row items-center pr-4 pl-2 h-full">
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={onChangeText}
              onBlur={handleBlur}
              placeholder={placeholder}
              placeholderTextColor="#8B7D6F"
              className="flex-1 text-sm font-poppins-regular text-text py-0"
              style={{ includeFontPadding: false }}
            />
            {value.length > 0 && (
              <Pressable onPress={handleClear} className="p-1">
                <FontAwesome6 name="xmark" size={16} color="#8B7D6F" />
              </Pressable>
            )}
          </View>
        )}
      </Animated.View>
    </View>
  );
}
