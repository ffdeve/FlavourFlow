import re

with open('src/app/(tabs)/index.tsx', 'r') as f:
    content = f.read()

# 1. Show first name only
old_name = '{profile?.full_name || "M.Usman"}'
new_name = '{(profile?.full_name || "M.Usman").split(" ")[0]}'
content = content.replace(old_name, new_name)

# 2. Set the fridge to most right
old_icons = """            {/* Action Icons on Right */}
            <View className="flex-row items-center space-x-4">
              <TouchableOpacity onPress={() => console.log("Navigate to Fridge")}>
                <Image source={require("@/assets/icons/fridge.webp")} style={{ width: 32, height: 32 }} contentFit="contain" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/my-favorites")}>
                <Image source={require("@/assets/icons/heart_filled.webp")} style={{ width: 32, height: 32 }} contentFit="contain" />
              </TouchableOpacity>
            </View>"""

new_icons = """            {/* Action Icons on Right */}
            <View className="flex-row items-center space-x-4">
              <TouchableOpacity onPress={() => router.push("/my-favorites")}>
                <Image source={require("@/assets/icons/heart_filled.webp")} style={{ width: 32, height: 32 }} contentFit="contain" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => console.log("Navigate to Fridge")}>
                <Image source={require("@/assets/icons/fridge.webp")} style={{ width: 32, height: 32 }} contentFit="contain" />
              </TouchableOpacity>
            </View>"""

content = content.replace(old_icons, new_icons)

with open('src/app/(tabs)/index.tsx', 'w') as f:
    f.write(content)
