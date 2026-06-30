import Avatar from "@/components/ui/avatar";
import { communityService } from "@/services/community.service";
import { recipeService } from "@/services/recipe.service";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CookingLoader } from "@/components/ui/cooking-loader";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";

export interface PostDraft {
  content: string;
  category: "general" | "recipe_tip" | "qa";
  imageUris: string[];
  recipeId: string | null;
  recipeName: string | null;
  recipeImage: string | null;
}

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userAvatar: string | null;
  onPostSubmit: (draft: PostDraft) => void;
}

export default function CreatePostModal({
  visible,
  onClose,
  userId,
  userName,
  userAvatar,
  onPostSubmit,
}: CreatePostModalProps) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<"general" | "recipe_tip" | "qa">(
    "general",
  );
  const [selectedImageUris, setSelectedImageUris] = useState<string[]>([]);

  // Recipe linking states
  const [linkedRecipe, setLinkedRecipe] = useState<any>(null);
  const [recipeSearchVisible, setRecipeSearchVisible] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  // Load recipes for linker
  useEffect(() => {
    if (recipeSearchVisible) {
      loadRecipes();
    }
  }, [recipeSearchVisible]);

  const loadRecipes = async () => {
    setLoadingRecipes(true);
    try {
      const data = await recipeService.getTrendingRecipes(50);
      setRecipes(data);
    } catch (err) {
      console.error("Error loading recipes for linker:", err);
    } finally {
      setLoadingRecipes(false);
    }
  };

  const handlePickImages = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Denied",
          "We need access to your photos to attach images.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 5,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map((asset) => asset.uri);
        setSelectedImageUris((prev) => {
          const combined = [...prev, ...uris];
          if (combined.length > 5) {
            Alert.alert("Limit Reached", "You can only attach up to 5 images.");
            return combined.slice(0, 5);
          }
          return combined;
        });
      }
    } catch (err) {
      console.error("Image picking error:", err);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setSelectedImageUris((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleCreatePost = () => {
    if (!content.trim() && selectedImageUris.length === 0) {
      Alert.alert("Empty Post", "Please add some text or attach an image.");
      return;
    }

    const draft: PostDraft = {
      content: content.trim(),
      category,
      imageUris: [...selectedImageUris],
      recipeId: linkedRecipe?.id || null,
      recipeName: linkedRecipe?.title || null,
      recipeImage: linkedRecipe?.image || linkedRecipe?.image_url || null,
    };

    // Reset immediately
    setContent("");
    setSelectedImageUris([]);
    setLinkedRecipe(null);
    setCategory("general");

    // Close modal and hand off draft to parent for background upload
    onClose();
    onPostSubmit(draft);
  };

  const filteredRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-[#F5E3D8]/30">
          <TouchableOpacity onPress={onClose} className="p-1">
            <Feather name="x" size={24} color="#8B7D6F" />
          </TouchableOpacity>
          <Text className="text-lg font-jakarta-bold text-[#3B3328] ml-2">
            Create Post
          </Text>
          <TouchableOpacity
            onPress={handleCreatePost}
            className="px-4 py-2 rounded-full bg-[#FBA82E]"
          >
            <Text className="text-white text-sm font-jakarta-semibold">
              Post
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 px-6 pt-4"
          showsVerticalScrollIndicator={false}
        >
          {/* User Info & Category Selector */}
          <View className="flex-row items-center mb-4">
            <Avatar url={userAvatar} name={userName} size={48} />
            <View className="ml-3">
              <Text className="text-base font-jakarta-bold text-[#3B3328]">
                {userName}
              </Text>
              <View className="flex-row mt-1.5 gap-2">
                <TouchableOpacity
                  onPress={() => setCategory("general")}
                  className={`px-3 py-1 rounded-full border ${
                    category === "general"
                      ? "bg-[#FBA82E] border-transparent"
                      : "bg-white border-[#F5E3D8]"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-inter-medium ${
                      category === "general" ? "text-white" : "text-[#3B3328]"
                    }`}
                  >
                    General
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCategory("recipe_tip")}
                  className={`px-3 py-1 rounded-full border ${
                    category === "recipe_tip"
                      ? "bg-[#FBA82E] border-transparent"
                      : "bg-white border-[#F5E3D8]"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-inter-medium ${
                      category === "recipe_tip"
                        ? "text-white"
                        : "text-[#3B3328]"
                    }`}
                  >
                    Recipe Tip
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCategory("qa")}
                  className={`px-3 py-1 rounded-full border ${
                    category === "qa"
                      ? "bg-[#FBA82E] border-transparent"
                      : "bg-white border-[#F5E3D8]"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-inter-medium ${
                      category === "qa" ? "text-white" : "text-[#3B3328]"
                    }`}
                  >
                    Q&A
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Text Content Input */}
          <TextInput
            multiline
            placeholder="Share your culinary experiences, ask cooking questions, or leave quick tips..."
            placeholderTextColor="#8B7D6F"
            value={content}
            onChangeText={setContent}
            className="text-base font-inter-regular text-[#3B3328] min-h-[140px] text-left mb-6"
            style={{ textAlignVertical: "top" }}
          />

          {/* Image Horizontal List */}
          {selectedImageUris.length > 0 && (
            <View className="mb-6">
              <Text className="text-xs font-jakarta-bold text-[#8B7D6F] mb-3">
                Selected Images ({selectedImageUris.length}) - Hold and drag to
                rearrange
              </Text>
              <View className="h-24">
                <DraggableFlatList
                  horizontal
                  data={selectedImageUris}
                  onDragEnd={({ data }) => setSelectedImageUris(data)}
                  keyExtractor={(item, index) => `${item}_${index}`}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item, drag, isActive }) => (
                    <ScaleDecorator>
                      <TouchableOpacity
                        activeOpacity={1}
                        onLongPress={drag}
                        delayLongPress={50}
                        disabled={isActive}
                        style={{ marginRight: 12 }}
                      >
                        <View
                          style={{
                            position: "relative",
                            width: 96,
                            height: 96,
                            borderRadius: 16,
                            overflow: "hidden",
                            backgroundColor: "#f3f4f6",
                            opacity: isActive ? 0.75 : 1,
                            transform: isActive ? [{ scale: 1.05 }] : [],
                          }}
                        >
                          <Image
                            source={{ uri: item }}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            onPress={() => {
                              const idx = selectedImageUris.indexOf(item);
                              if (idx > -1) handleRemoveImage(idx);
                            }}
                            style={{
                              position: "absolute",
                              top: 4,
                              right: 4,
                              backgroundColor: "rgba(0,0,0,0.6)",
                              borderRadius: 9999,
                              padding: 4,
                            }}
                          >
                            <Ionicons name="close" size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    </ScaleDecorator>
                  )}
                />
              </View>
            </View>
          )}

          {/* Linked Recipe Preview */}
          {linkedRecipe && (
            <View className="mb-6 bg-[#FAF5EF] border border-[#F5E3D8]/50 rounded-2xl p-4 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Image
                  source={{
                    uri:
                      linkedRecipe.image ||
                      linkedRecipe.image_url ||
                      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
                  }}
                  className="w-12 h-12 rounded-xl bg-gray-200"
                  resizeMode="cover"
                />
                <View className="ml-3 flex-1">
                  <Text className="text-xs font-jakarta-bold text-[#8B7D6F]">
                    Linked Recipe
                  </Text>
                  <Text
                    className="text-sm font-jakarta-bold text-[#3B3328]"
                    numberOfLines={1}
                  >
                    {linkedRecipe.title}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setLinkedRecipe(null)}
                className="p-2"
              >
                <Feather name="trash-2" size={16} color="#E05252" />
              </TouchableOpacity>
            </View>
          )}

          {/* Attachment Controls */}
          <View className="flex-row gap-4 border-t border-[#F5E3D8]/30 pt-6 pb-12">
            {/* Pick Photo */}
            <TouchableOpacity
              onPress={handlePickImages}
              className="flex-1 bg-[#FAF5EF] border border-[#F5E3D8]/60 p-4 rounded-2xl flex-col items-center justify-center"
            >
              <Image
                source={require("@/assets/icons/photos.webp")}
                style={{ width: 52, height: 52 }}
                resizeMode="contain"
              />
              <Text className="text-xs font-jakarta-semibold text-[#3B3328] mt-2">
                Attach Photos
              </Text>
            </TouchableOpacity>

            {/* Link Recipe */}
            <TouchableOpacity
              onPress={() => setRecipeSearchVisible(true)}
              className="flex-1 bg-[#FAF5EF] border border-[#F5E3D8]/60 p-4 rounded-2xl flex-col items-center justify-center"
            >
              <Image
                source={require("@/assets/icons/share_recipe.webp")}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
              />
              <Text className="text-xs font-jakarta-semibold text-[#3B3328] mt-2">
                Link Recipe
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Inline Recipe Picker Search Modal */}
      <Modal
        visible={recipeSearchVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRecipeSearchVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center px-6 py-4 border-b border-[#F5E3D8]/30">
            <TouchableOpacity
              onPress={() => setRecipeSearchVisible(false)}
              className="p-1"
            >
              <Feather name="chevron-left" size={24} color="#8B7D6F" />
            </TouchableOpacity>
            <Text className="text-lg font-jakarta-bold text-[#3B3328] ml-2">
              Link Recipe
            </Text>
          </View>

          {/* Search Input */}
          <View className="px-6 py-3">
            <View className="flex-row items-center border border-[#F5E3D8]/60 bg-[#FAF5EF]/45 rounded-full px-4 py-2">
              <Feather name="search" size={18} color="#8B7D6F" />
              <TextInput
                placeholder="Search recipes..."
                placeholderTextColor="#8B7D6F"
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-2 text-sm font-inter-medium text-[#3B3328]"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color="#8B7D6F" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Recipe List */}
          {loadingRecipes ? (
            <View className="flex-1 justify-center items-center">
              <CookingLoader scale={0.8} />
            </View>
          ) : (
            <FlatList
              data={filteredRecipes}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ padding: 24 }}
              ListEmptyComponent={
                <View className="py-12 items-center">
                  <Text className="text-sm font-inter-medium text-[#8B7D6F]">
                    No recipes found.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setLinkedRecipe(item);
                    setRecipeSearchVisible(false);
                  }}
                  className="flex-row items-center py-3 border-b border-[#F5E3D8]/10"
                >
                  <Image
                    source={{
                      uri:
                        item.image ||
                        item.image_url ||
                        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
                    }}
                    className="w-14 h-14 rounded-xl bg-gray-200"
                    resizeMode="cover"
                  />
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-jakarta-semibold text-[#3B3328]">
                      {item.title}
                    </Text>
                    <Text
                      className="text-xs font-inter-medium text-[#8B7D6F] mt-0.5"
                      numberOfLines={1}
                    >
                      {item.description || "No description"}
                    </Text>
                  </View>
                  <Ionicons
                    name="add-circle-outline"
                    size={22}
                    color="#FBA82E"
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </Modal>
  );
}
