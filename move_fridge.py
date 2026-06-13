import re

with open('src/app/(tabs)/index.tsx', 'r') as f:
    content = f.read()

old_header = """          {/* Header Section */}
          <View className="px-6 pb-6 flex-row justify-between items-center">
            <View className="flex-row items-center">
              {/* Fridge Icon on Left */}
              <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center mr-3">
                <Image source={require("@/assets/icons/fridge.webp")} style={{ width: 26, height: 26 }} contentFit="contain" /> 
              </View>
              <View>
                <Text className="font-poppins-regular text-white/80 text-sm">
                  Welcome Back!
                </Text>
                <Text className="font-poppins-bold text-white text-xl">
                  {profile?.full_name || "M.Usman"}
                </Text>
              </View>
            </View>
            
            {/* Heart Icon on Right */}
            <TouchableOpacity 
              className="w-12 h-12 bg-white/20 rounded-full items-center justify-center"
              onPress={() => console.log("Navigate to Favorites")}
            >
              <Image source={require("@/assets/icons/heart_filled.webp")} style={{ width: 26, height: 26 }} contentFit="contain" />
            </TouchableOpacity>
          </View>"""

new_header = """          {/* Header Section */}
          <View className="px-6 pb-6 flex-row justify-between items-center">
            <View>
              <Text className="font-poppins-regular text-white/80 text-sm">
                Welcome Back!
              </Text>
              <Text className="font-poppins-bold text-white text-xl">
                {profile?.full_name || "M.Usman"}
              </Text>
            </View>
            
            {/* Action Icons on Right */}
            <View className="flex-row items-center space-x-4">
              <TouchableOpacity onPress={() => console.log("Navigate to Fridge")}>
                <Image source={require("@/assets/icons/fridge.webp")} style={{ width: 32, height: 32 }} contentFit="contain" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/my-favorites")}>
                <Image source={require("@/assets/icons/heart_filled.webp")} style={{ width: 32, height: 32 }} contentFit="contain" />
              </TouchableOpacity>
            </View>
          </View>"""

content = content.replace(old_header, new_header)

with open('src/app/(tabs)/index.tsx', 'w') as f:
    f.write(content)
