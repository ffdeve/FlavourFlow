import re

with open('src/components/ui/post-card.tsx', 'r') as f:
    content = f.read()

# 1. Add new imports
new_imports = """import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";"""

content = content.replace(
    'import { router } from "expo-router";',
    'import { router } from "expo-router";\n' + new_imports
)

# 2. Add animation state inside PostCard component
anim_state = """  const heartScale = useSharedValue(1);

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }]
  }));"""

content = content.replace(
    'const [activeImageIndex, setActiveImageIndex] = useState(0);',
    'const [activeImageIndex, setActiveImageIndex] = useState(0);\n' + anim_state
)

# 3. Update handleLikePress to trigger haptics and animation
new_like_logic = """  const handleLikePress = async () => {
    // Haptics and Animation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 2, stiffness: 200 }),
      withSpring(1, { damping: 2, stiffness: 200 })
    );

    const newLiked = !isLiked;
    setIsLiked(newLiked);"""

content = content.replace(
    """  const handleLikePress = async () => {
    // Optimistic UI updates
    const newLiked = !isLiked;
    setIsLiked(newLiked);""",
    new_like_logic
)

# 4. Enhance the Like button UI
old_like_btn = """        <View className="flex-row items-center space-x-6">
          {/* Like */}
          <TouchableOpacity
            onPress={handleLikePress}
            className="flex-row items-center py-1 pr-3"
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={22}
              color={isLiked ? "#E05252" : "#8B7D6F"}
            />
            <Text className="text-sm font-inter-medium text-[#8B7D6F] ml-1.5">"""

new_like_btn = """        <View className="flex-row items-center space-x-6">
          {/* Like */}
          <TouchableOpacity
            onPress={handleLikePress}
            activeOpacity={0.7}
            className="flex-row items-center py-1 pr-3"
          >
            <Animated.View style={animatedHeartStyle}>
              {isLiked ? (
                <ExpoImage 
                  source={require("@/assets/icons/heart_filled.webp")} 
                  style={{ width: 24, height: 24 }} 
                  contentFit="contain" 
                />
              ) : (
                <Ionicons name="heart-outline" size={24} color="#8B7D6F" />
              )}
            </Animated.View>
            <Text className="text-sm font-jakarta-medium text-[#8B7D6F] ml-2">"""

content = content.replace(old_like_btn, new_like_btn)

# 5. Enhance Carousel
old_carousel = """      {/* Image Carousel (Instagram-like) */}
      {images.length > 0 && (
        <View className="mb-4 rounded-2xl overflow-hidden bg-gray-50">
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
              setActiveImageIndex(slide);
            }}
            keyExtractor={(item, index) => `${item}_${index}`}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={{ width: CARD_WIDTH - 40, height: 280 }}
                resizeMode="cover"
              />
            )}
          />
          
          {/* Pagination Indicators */}
          {images.length > 1 && (
            <View className="flex-row justify-center py-2 bg-white/70 absolute bottom-0 left-0 right-0">
              {images.map((_, i) => (
                <View
                  key={i}
                  className={`h-1.5 rounded-full mx-1 ${
                    i === activeImageIndex ? "w-4 bg-[#FBA82E]" : "w-1.5 bg-[#8B7D6F]/40"
                  }`}
                />
              ))}
            </View>
          )}
        </View>
      )}"""

new_carousel = """      {/* Premium Image Carousel */}
      {images.length > 0 && (
        <View className="mb-4 rounded-[20px] overflow-hidden bg-gray-100">
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH - 40));
              setActiveImageIndex(slide);
            }}
            keyExtractor={(item, index) => `${item}_${index}`}
            renderItem={({ item }) => (
              <ExpoImage
                source={{ uri: item }}
                style={{ width: CARD_WIDTH - 40, height: 300 }}
                contentFit="cover"
                transition={200}
              />
            )}
          />
          
          {/* Glassmorphic Gradient Overlay for Pagination */}
          {images.length > 1 && (
            <LinearGradient
              colors={["transparent", "rgba(59, 51, 40, 0.6)"]}
              className="absolute bottom-0 left-0 right-0 h-16 justify-end pb-3 items-center"
            >
              <View className="flex-row justify-center">
                {images.map((_, i) => (
                  <Animated.View
                    key={i}
                    className={`h-1.5 rounded-full mx-1 ${
                      i === activeImageIndex ? "bg-[#FBA82E]" : "bg-white/50"
                    }`}
                    style={{ width: i === activeImageIndex ? 16 : 6 }}
                  />
                ))}
              </View>
            </LinearGradient>
          )}
        </View>
      )}"""

content = content.replace(old_carousel, new_carousel)

# 6. Enhance Shared Recipe Widget
old_recipe = """      {/* Shared Recipe Card */}
      {sharedRecipe && (
        <TouchableOpacity
          onPress={() => router.push(`/recipe-detail?id=${sharedRecipe.id}`)}
          className="flex-row bg-[#FAF5EF] rounded-2xl border border-[#F5E3D8]/50 p-3 mb-4 items-center"
        >
          <Image
            source={{ uri: sharedRecipe.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c" }}
            className="w-14 h-14 rounded-xl bg-gray-200"
            resizeMode="cover"
          />
          <View className="ml-3 flex-1">
            <Text className="text-sm font-jakarta-semibold text-[#3B3328]" numberOfLines={1}>
              {sharedRecipe.title}
            </Text>
            <Text className="text-xs font-inter-medium text-[#8B7D6F] mt-0.5">
              By {sharedRecipe.created_by === currentUserId ? "You" : "FlavourFlow Chef"}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color="#8B7D6F" className="mr-1" />
        </TouchableOpacity>
      )}"""

new_recipe = """      {/* Enhanced Shared Recipe Card */}
      {sharedRecipe && (
        <TouchableOpacity
          onPress={() => router.push(`/recipe-detail?id=${sharedRecipe.id}`)}
          className="flex-row bg-white rounded-2xl p-3 mb-4 items-center border border-[#F5E3D8]"
          style={{
            shadowColor: "#3B3328",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 2,
          }}
          activeOpacity={0.8}
        >
          <ExpoImage
            source={{ uri: sharedRecipe.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c" }}
            style={{ width: 60, height: 60, borderRadius: 14 }}
            contentFit="cover"
          />
          <View className="ml-4 flex-1">
            <Text className="text-[15px] font-jakarta-bold text-[#3B3328] mb-1" numberOfLines={1}>
              {sharedRecipe.title}
            </Text>
            <View className="flex-row items-center">
              <Ionicons name="restaurant-outline" size={12} color="#FBA82E" />
              <Text className="text-xs font-inter-medium text-[#8B7D6F] ml-1">
                {sharedRecipe.created_by === currentUserId ? "Your Recipe" : "Community Recipe"}
              </Text>
            </View>
          </View>
          <View className="w-8 h-8 rounded-full bg-[#FAF5EF] items-center justify-center">
            <Feather name="arrow-right" size={16} color="#FBA82E" />
          </View>
        </TouchableOpacity>
      )}"""

content = content.replace(old_recipe, new_recipe)

with open('src/components/ui/post-card.tsx', 'w') as f:
    f.write(content)
