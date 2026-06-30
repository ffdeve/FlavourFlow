import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { CookingLoader } from "@/components/ui/cooking-loader";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Fuse from "fuse.js";
import { recipeService } from "@/services/recipe.service";
import type { Ingredient } from "@/types";

export interface SelectedIngredient {
  name: string;
  icon_url: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (ingredients: SelectedIngredient[]) => void;
}

const MAGNIFIER = require("@/assets/icons/magnifying_glass.webp");

export function IngredientSelectorModal({ visible, onClose, onConfirm }: Props) {
  const [all, setAll] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Load the master ingredient list once when first opened
  useEffect(() => {
    if (!visible || all.length > 0) return;
    setLoading(true);
    recipeService
      .getIngredients()
      .then((rows) => setAll(rows as Ingredient[]))
      .finally(() => setLoading(false));
  }, [visible]);

  const fuse = useMemo(
    () => new Fuse(all, { keys: ["name", "name_urdu"], threshold: 0.3 }),
    [all],
  );

  const results = useMemo(() => {
    if (!query.trim()) return all;
    return fuse.search(query).map((r) => r.item);
  }, [query, all, fuse]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const handleConfirm = () => {
    if (selected.size === 0) return;
    const picked = all
      .filter((i) => selected.has(i.name))
      .map((i) => ({ name: i.name, icon_url: i.icon_url ?? null }));
    onConfirm(picked);
    setSelected(new Set());
    setQuery("");
    onClose();
  };

  const renderItem = ({ item }: { item: Ingredient }) => {
    const isSelected = selected.has(item.name);
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => toggle(item.name)}
        className="items-center mb-4"
        style={{ width: "25%" }}
      >
        <View
          className="items-center justify-center rounded-2xl"
          style={{
            width: 64,
            height: 64,
            backgroundColor: isSelected ? "#FBA82E" : "#FAF5EF",
            borderWidth: isSelected ? 0 : 1,
            borderColor: "#F5E3D8",
          }}
        >
          {item.icon_url ? (
            <Image
              source={{ uri: item.icon_url }}
              style={{ width: 40, height: 40 }}
              contentFit="contain"
            />
          ) : (
            <Feather name="circle" size={24} color="#C4B8AC" />
          )}
        </View>
        <Text
          numberOfLines={1}
          className="text-[11px] font-inter-medium text-[#3B3328] mt-1.5 text-center"
          style={{ width: 70 }}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />

      {/* Sheet */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-[#FFFDF5] rounded-t-[28px]"
        style={{ height: "78%", paddingBottom: 24 }}
      >
        {/* Grabber */}
        <View className="items-center pt-3 pb-1">
          <View className="w-10 h-1.5 rounded-full bg-[#E5D9CC]" />
        </View>

        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
          <Text className="text-[18px] font-jakarta-bold text-[#3B3328]">
            What's in your fridge?
          </Text>
          <TouchableOpacity onPress={onClose} className="w-8 h-8 items-center justify-center rounded-full bg-[#FAF5EF]">
            <Feather name="x" size={18} color="#3B3328" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View className="mx-5 mb-3 flex-row items-center bg-white border border-[#F5E3D8] rounded-[16px] px-3 h-12">
          <Image source={MAGNIFIER} style={{ width: 18, height: 18 }} contentFit="contain" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search ingredients..."
            placeholderTextColor="#C4B8AC"
            className="flex-1 ml-2 text-[14px] font-inter-medium text-[#3B3328]"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x-circle" size={16} color="#C4B8AC" />
            </TouchableOpacity>
          )}
        </View>

        {/* Grid */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <CookingLoader scale={0.8} />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.ingredient_id)}
            renderItem={renderItem}
            numColumns={4}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 90 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text className="text-center text-[13px] font-inter-medium text-[#8B7D6F] mt-10">
                No ingredients found for "{query}"
              </Text>
            }
          />
        )}

        {/* Confirm button */}
        <View className="absolute bottom-6 left-5 right-5">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleConfirm}
            disabled={selected.size === 0}
            className={`h-14 rounded-[18px] items-center justify-center ${
              selected.size > 0 ? "bg-[#FBA82E]" : "bg-[#F5E3D8]"
            }`}
            style={
              selected.size > 0
                ? {
                    shadowColor: "#FBA82E",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }
                : undefined
            }
          >
            <Text
              className={`text-[15px] font-jakarta-semibold ${
                selected.size > 0 ? "text-white" : "text-[#C4B8AC]"
              }`}
            >
              {selected.size > 0
                ? `Add ${selected.size} ingredient${selected.size > 1 ? "s" : ""}`
                : "Select ingredients"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
