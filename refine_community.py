import re

with open('src/app/(tabs)/community.tsx', 'r') as f:
    content = f.read()

# 1. Add new imports
new_imports = """import Animated, { LinearTransition } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";"""

content = content.replace(
    'import type { Post } from "@/types";',
    'import type { Post } from "@/types";\n' + new_imports
)

# 2. Add LinearGradient to header
old_header = """      {/* Screen Header */}
      <View className="px-6 pt-16 pb-4">"""

new_header = """      {/* Screen Header */}
      <LinearGradient
        colors={["#FAF5EF", "transparent"]}
        className="absolute top-0 left-0 right-0 h-40"
      />
      <View className="px-6 pt-16 pb-4 z-10">"""

content = content.replace(old_header, new_header)

# 3. Enhance Input Bar
old_input = """      {/* What's on your mind card */}
      <TouchableOpacity
        onPress={() => setCreatePostVisible(true)}
        className="mx-4 mb-5 bg-white rounded-[24px] border border-[#F5E3D8]/50 p-4 flex-row items-center"
        style={{
          shadowColor: "#3B3328",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.03,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <Avatar url={currentUserAvatar} name={currentUserName} size={44} />
        <View className="flex-1 ml-3 bg-[#FAF5EF]/60 border border-[#F5E3D8]/40 rounded-full px-4 py-3">
          <Text className="text-sm font-inter-medium text-[#8B7D6F]">
            Share your culinary experience...
          </Text>
        </View>
        <View className="ml-3 flex-row space-x-2">
          <Ionicons name="images-outline" size={20} color="#FBA82E" />
        </View>
      </TouchableOpacity>"""

new_input = """      {/* What's on your mind card (Enhanced) */}
      <TouchableOpacity
        onPress={() => setCreatePostVisible(true)}
        className="mx-4 mb-5 bg-white rounded-[24px] border border-[#F5E3D8] p-4 flex-row items-center"
        style={{
          shadowColor: "#FBA82E",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        }}
        activeOpacity={0.8}
      >
        <Avatar url={currentUserAvatar} name={currentUserName} size={46} />
        <View className="flex-1 ml-3 bg-[#FAF5EF] border border-[#F5E3D8]/80 rounded-[20px] px-4 py-3.5 flex-row items-center">
          <Feather name="edit-2" size={14} color="#8B7D6F" className="mr-2" />
          <Text className="text-sm font-jakarta-medium text-[#8B7D6F]">
            Share a recipe or tip...
          </Text>
        </View>
        <View className="ml-3 w-10 h-10 rounded-full bg-[#FAF5EF] items-center justify-center">
          <Ionicons name="images" size={20} color="#FBA82E" />
        </View>
      </TouchableOpacity>"""

content = content.replace(old_input, new_input)

# 4. Enhance Filter Tabs with Animated Layout
old_tabs = """      {/* Filter Tabs */}
      <View className="flex-row px-4 mb-5 space-x-2">
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveFilter(tab)}
            className={`px-5 py-2.5 rounded-full border ${
              activeFilter === tab
                ? "bg-[#FBA82E] border-transparent"
                : "bg-white border-[#F5E3D8]/60"
            }`}
          >
            <Text
              className={`text-sm font-jakarta-semibold ${
                activeFilter === tab ? "text-white" : "text-[#3B3328]"
              }`}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>"""

new_tabs = """      {/* Filter Tabs (Animated) */}
      <View className="flex-row px-4 mb-5 space-x-2">
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveFilter(tab)}
            activeOpacity={0.7}
          >
            <Animated.View
              layout={LinearTransition.spring({ damping: 14, stiffness: 200 })}
              className={`px-5 py-2.5 rounded-[20px] border ${
                activeFilter === tab
                  ? "bg-[#FBA82E] border-transparent"
                  : "bg-white border-[#F5E3D8]"
              }`}
            >
              <Text
                className={`text-[13px] tracking-tight font-jakarta-bold ${
                  activeFilter === tab ? "text-white" : "text-[#8B7D6F]"
                }`}
              >
                {tab}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>"""

content = content.replace(old_tabs, new_tabs)

with open('src/app/(tabs)/community.tsx', 'w') as f:
    f.write(content)
