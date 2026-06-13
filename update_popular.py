import re

with open('src/components/ui/popular-recipe-card.tsx', 'r') as f:
    content = f.read()

# Make it larger and more primary
old_container = """    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="bg-white rounded-2xl overflow-hidden mr-4 w-48"
      style={{
        shadowColor: "#3B3328",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {/* Image Area with overlays */}
      <View className="relative w-full h-36 overflow-hidden">"""

new_container = """    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="bg-white rounded-[24px] overflow-hidden mr-5 w-60"
      style={{
        shadowColor: "#FBA82E",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 5,
        borderWidth: 1,
        borderColor: "rgba(245, 227, 216, 0.4)"
      }}
    >
      {/* Image Area with overlays */}
      <View className="relative w-full h-44 overflow-hidden">"""

content = content.replace(old_container, new_container)

old_text = """      {/* White Content Area */}
      <View className="px-3 pb-3 -mt-1">
        <Text
          className="font-jakarta-bold text-[#3B3328] text-sm mb-2 leading-[18px]"
          numberOfLines={2}
        >
          {title}
        </Text>
        <View className="flex-row items-center justify-between">
          {ingredientsCount != null && (
            <Text className="font-inter-medium text-[#8B7D6F] text-[10px]">
              {ingredientsCount} Ingredients
            </Text>
          )}
          <View className="flex-row items-center">
            <Feather name="clock" size={10} color="#8B7D6F" />
            <Text className="font-inter-medium text-[#8B7D6F] text-[10px] ml-1">
              {time}
            </Text>
          </View>
        </View>
      </View>"""

new_text = """      {/* White Content Area */}
      <View className="px-4 pb-4 -mt-2">
        <Text
          className="font-jakarta-extrabold text-[#3B3328] text-[16px] mb-2.5 leading-[22px]"
          numberOfLines={2}
        >
          {title}
        </Text>
        <View className="flex-row items-center justify-between">
          {ingredientsCount != null && (
            <View className="bg-[#FAF5EF] px-2 py-1 rounded-md">
              <Text className="font-inter-semibold text-[#FBA82E] text-[11px]">
                {ingredientsCount} Ingredients
              </Text>
            </View>
          )}
          <View className="flex-row items-center bg-[#FAF5EF] px-2 py-1 rounded-md">
            <Feather name="clock" size={12} color="#8B7D6F" />
            <Text className="font-inter-semibold text-[#8B7D6F] text-[11px] ml-1.5">
              {time}
            </Text>
          </View>
        </View>
      </View>"""

content = content.replace(old_text, new_text)

with open('src/components/ui/popular-recipe-card.tsx', 'w') as f:
    f.write(content)
