import { DiamondChip, getFlagEmoji } from "@/components/ui/diamond-chip";
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from "react";
import { Dimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    cancelAnimation,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_WIDTH = 95; // Matches DiamondChip approximate width
const SPACING_X = 12;   // space between chips
const TOTAL_ITEM_WIDTH = ITEM_WIDTH + SPACING_X;

const MarqueeRow = ({ items, isFlag, selectedItems, toggleSelection, setSelectedItems, rowIndex, scrollOffset }: any) => {
  // Duplicate array multiple times for infinite continuous loop
  const displayItems = [...items, ...items, ...items, ...items];
  
  const animatedStyle = useAnimatedStyle(() => ({
    flexDirection: 'row',
    transform: [{ translateX: scrollOffset.value }],
  }));

  // Stagger alternating rows
  const isOddRow = rowIndex % 2 !== 0;
  
  return (
    <View 
      className="flex-row items-center w-full my-[-4px]" 
      style={{ marginLeft: isOddRow ? TOTAL_ITEM_WIDTH / 2 : 0 }}
    >
      <Animated.View style={animatedStyle} className="px-4">
        {displayItems.map((item: any, index: number) => {
          const label = item.label || item.name;
          
          // Use country code (uppercase) for countries, name/value for other items
          const value = isFlag 
            ? (item.country_code || item.code || item.value || "").toUpperCase()
            : (item.value || item.name);
            
          const countryCode = item.country_code || item.code;
          const emoji = isFlag && countryCode
            ? getFlagEmoji(countryCode)
            : (item.emoji || null);
            
          const isSelected = selectedItems.includes(value);

          return (
            <View key={`${value}-${index}`} style={{ width: ITEM_WIDTH, marginRight: SPACING_X }}>
              <DiamondChip
                label={label}
                emoji={emoji}
                isFlag={isFlag}
                isSelected={isSelected}
                onPress={() => toggleSelection(value, selectedItems, setSelectedItems)}
                imageUrl={item.icon_url}
              />
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
};

export const BrickWallCarousel = ({ data, isFlag, selectedItems, toggleSelection, setSelectedItems }: any) => {
  const chunkRows = () => {
    if (!data || data.length === 0) return [[], [], []];
    
    // Shuffle the base array
    const shuffled = [...data].sort(() => 0.5 - Math.random());
    
    // Shift arrays to prevent vertical stacking matches while keeping exact same length
    const offset = Math.floor(shuffled.length / 3);
    
    const row1 = [...shuffled];
    const row2 = [...shuffled.slice(offset), ...shuffled.slice(0, offset)];
    const row3 = [...shuffled.slice(offset * 2), ...shuffled.slice(0, offset * 2)];
    
    return [row1, row2, row3];
  };
  
  const [rows, setRows] = useState(() => chunkRows());

  // Re-chunk rows if data changes
  useEffect(() => {
    setRows(chunkRows());
  }, [data]);

  const listWidth = (data?.length || 0) * TOTAL_ITEM_WIDTH;
  const scrollOffset = useSharedValue(0);

  const startAutoScroll = () => {
    if (!data || data.length === 0) return;
    cancelAnimation(scrollOffset);
    scrollOffset.value = withRepeat(
      withTiming(-listWidth, {
        duration: data.length * 3000, 
        easing: Easing.linear,
      }),
      -1, 
      false
    );
  };

  useEffect(() => {
    startAutoScroll();
    return () => cancelAnimation(scrollOffset);
  }, [data?.length]);

  // Use onStart instead of onBegin to allow tap events to pass through to DiamondChip
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onStart(() => {
      cancelAnimation(scrollOffset);
    })
    .onChange((event) => {
      let newOffset = scrollOffset.value + event.changeX;
      if (newOffset > 0) newOffset -= listWidth;
      if (newOffset < -listWidth) newOffset += listWidth;
      scrollOffset.value = newOffset;
    })
    .onFinalize(() => {
      runOnJS(startAutoScroll)();
    });

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View className="mt-8 pb-12 w-full relative overflow-hidden justify-center items-start bg-transparent">
        {rows.map((rowItems, idx) => (
          <MarqueeRow 
            key={idx}
            items={rowItems} 
            isFlag={isFlag} 
            selectedItems={selectedItems} 
            toggleSelection={toggleSelection} 
            setSelectedItems={setSelectedItems} 
            rowIndex={idx}
            scrollOffset={scrollOffset}
          />
        ))}

        {/* Edge Fade Masks */}
        <LinearGradient
          colors={['#fdfaf3', 'transparent']} 
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="absolute left-0 top-0 bottom-0 w-8 z-10"
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', '#fdfaf3']} 
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="absolute right-0 top-0 bottom-0 w-8 z-10"
          pointerEvents="none"
        />
      </View>
    </GestureDetector>
  );
};
