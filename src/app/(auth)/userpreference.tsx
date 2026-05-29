import AnimatedSearchBar from "@/components/ui/animated-search-bar";
import { BrickWallCarousel } from "@/components/ui/brick-wall-carousel";
import { Button } from "@/components/ui/button";
import SpiceSelector from "@/components/ui/spice-selector";
import { profileService } from "@/services/profile.service";
import { useAuthStore } from "@/store/auth.store";
import type { CuisineItem } from "@/types";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Fallback Country data with country/flag codes
const STATIC_COUNTRIES = [
  { value: "PK", label: "Pakistan", code: "PK" },
  { value: "IT", label: "Italy", code: "IT" },
  { value: "MX", label: "Mexico", code: "MX" },
  { value: "FR", label: "France", code: "FR" },
  { value: "CN", label: "China", code: "CN" },
  { value: "JP", label: "Japan", code: "JP" },
  { value: "US", label: "America", code: "US" },
  { value: "ES", label: "Spain", code: "ES" },
  { value: "TR", label: "Turkey", code: "TR" },
  { value: "IN", label: "India", code: "IN" },
];

const STATIC_CUISINES = [
  { value: "Biryani", label: "Biryani", emoji: "🍛" },
  { value: "Karahi", label: "Karahi", emoji: "🍲" },
  { value: "Pizza", label: "Pizza", emoji: "🍕" },
  { value: "Pasta", label: "Pasta", emoji: "🍝" },
  { value: "Sushi", label: "Sushi", emoji: "🍣" },
  { value: "Tacos", label: "Tacos", emoji: "🌮" },
  { value: "Burgers", label: "Burgers", emoji: "🍔" },
  { value: "Kabab", label: "Kabab", emoji: "🍢" },
  { value: "Nihari", label: "Nihari", emoji: "🍲" },
  { value: "Daal Chawal", label: "Daal Chawal", emoji: "🍛" },
];

const STATIC_ALLERGIES = [
  { value: "Peanuts", label: "Peanuts", emoji: "🥜" },
  { value: "Gluten", label: "Gluten", emoji: "🌾" },
  { value: "Dairy", label: "Dairy", emoji: "🥛" },
  { value: "Soy", label: "Soy", emoji: "🫛" },
  { value: "Shellfish", label: "Shellfish", emoji: "🍤" },
  { value: "Tree Nuts", label: "Tree Nuts", emoji: "🌰" },
  { value: "Eggs", label: "Eggs", emoji: "🍳" },
  { value: "Fish", label: "Fish", emoji: "🐟" },
];

export default function UserPreferenceScreen() {
  const { updatePreferences, markPreferencesComplete, signOut } = useAuthStore();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // DB catalog lists and loading state
  const [countries, setCountries] = useState<any[]>(STATIC_COUNTRIES);
  const [cuisines, setCuisines] = useState<any[]>(STATIC_CUISINES);
  const [allergies, setAllergies] = useState<any[]>(STATIC_ALLERGIES);

  // States for user choices
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [spiceLevel, setSpiceLevel] = useState<number>(3); // Defaults to medium (3)

  // Fetch catalog on mount
  useEffect(() => {
    async function loadCatalog() {
      try {
        const [dbCountries, dbCuisines, dbAllergens] = await Promise.all([
          profileService.getCuisineItems('country'),
          profileService.getCuisineItems('cuisine'),
          profileService.getCuisineItems('allergen'),
        ]);

        if (dbCountries.length > 0) setCountries(dbCountries);
        if (dbCuisines.length > 0) setCuisines(dbCuisines);
        if (dbAllergens.length > 0) setAllergies(dbAllergens);
      } catch (err) {
        console.warn("Could not load dynamic DB catalog, using static fallback lists:", err);
      }
    }
    loadCatalog();
  }, []);

  const toggleSelection = (
    item: string,
    currentSelection: string[],
    setSelection: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setSelection((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleNext = () => {
    if (step === 1 && selectedCountries.length < 1) {
      Alert.alert("Requirement", "Please select at least 1 Country.");
      return;
    }
    if (step === 2 && selectedCuisines.length < 5) {
      Alert.alert("Requirement", "Please select at least 5 cuisines.");
      return;
    }
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleFinish = async () => {
    try {
      setIsLoading(true);
      // Save arrays to Postgres columns
      await updatePreferences({
        preferred_country: selectedCountries,
        preferred_cuisines: selectedCuisines,
        allergies: selectedAllergies,
        spice_level: spiceLevel,
      });

      // Mark setup as completed in DB
      await markPreferencesComplete();
      
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Save preferences error:", error);
      Alert.alert("Error", "Could not save preferences to database. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter allergies locally based on search bar query
  const filteredAllergies = allergies.filter((allergen) => {
    const name = allergen.label || allergen.name || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-5 pt-4 pb-8 min-h-[90vh]">
          
          {/* Header & Back Navigation */}
          <View className="mb-4 mt-2">
            {step < 5 && (
              <TouchableOpacity
                onPress={async () => {
                  if (step > 1) {
                    setStep(step - 1);
                  } else {
                    try {
                      await signOut();
                      router.replace("/(auth)/login");
                    } catch (error) {
                      router.replace("/(auth)/login");
                    }
                  }
                }}
                className="mb-4 mt-2 w-10 h-10 items-center justify-center bg-black/5 rounded-full"
              >
                <Text className="text-xl text-text font-bold">←</Text>
              </TouchableOpacity>
            )}

            {/* Progress segmented indicator */}
            {step < 5 && (
              <View className="flex-row items-center justify-between mb-6">
                {[1, 2, 3, 4].map((s) => (
                  <View 
                    key={s} 
                    className={`h-1.5 rounded-full flex-1 mx-1 ${
                      s <= step ? "bg-primary" : "bg-black/10"
                    }`} 
                  />
                ))}
              </View>
            )}

            {step === 1 && (
              <View>
                <Text className="text-4xl text-primary font-poppins-semibold leading-tight">
                  Your Preferred{"\n"}Country Food
                </Text>
                <Text className="text-text-secondary font-poppins-light text-sm mt-1">
                  Select At-least 1 Option
                </Text>
              </View>
            )}

            {step === 2 && (
              <View>
                <Text className="text-4xl text-primary font-poppins-semibold leading-tight">
                  Your Preferred{"\n"}Cuisines?
                </Text>
                <Text className="text-text-secondary font-poppins-light text-sm mt-1">
                  Select At-least 5 Options
                </Text>
              </View>
            )}

            {step === 3 && (
              <View>
                <Text className="text-4xl text-primary font-poppins-semibold leading-tight">
                  Any Allergies{"\n"}Or Dislikes?
                </Text>
                <Text className="text-text-secondary font-poppins-light text-sm mt-1">
                  Select if any (Optional)
                </Text>
              </View>
            )}

            {step === 4 && (
              <View>
                <Text className="text-4xl text-primary font-poppins-semibold leading-tight">
                  Choose Your{"\n"}Spice Level
                </Text>
                <Text className="text-text-secondary font-poppins-light text-sm mt-1">
                  We'll customize your recipes accordingly
                </Text>
              </View>
            )}
            
            {step === 5 && (
              <View className="items-center mt-8">
                <View className="w-full">
                  <TouchableOpacity onPress={() => setStep(4)} className="mb-4 w-10 h-10 items-center justify-center bg-black/5 rounded-full">
                    <Text className="text-xl text-text font-bold">←</Text>
                  </TouchableOpacity>
                  <Text className="text-4xl text-primary font-poppins-semibold leading-tight">
                    Setup{"\n"}Completed
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Staggered Brick Wall Slider Sections */}
          {step === 1 && (
            <BrickWallCarousel
              data={countries}
              isFlag={true}
              selectedItems={selectedCountries}
              toggleSelection={toggleSelection}
              setSelectedItems={setSelectedCountries}
            />
          )}

          {step === 2 && (
            <BrickWallCarousel
              data={cuisines}
              isFlag={false}
              selectedItems={selectedCuisines}
              toggleSelection={toggleSelection}
              setSelectedItems={setSelectedCuisines}
            />
          )}

          {step === 3 && (
            <View className="flex-1">
              <AnimatedSearchBar 
                value={searchQuery} 
                onChangeText={setSearchQuery} 
                placeholder="Search allergies..." 
              />
              <BrickWallCarousel
                data={filteredAllergies}
                isFlag={false}
                selectedItems={selectedAllergies}
                toggleSelection={toggleSelection}
                setSelectedItems={setSelectedAllergies}
              />
            </View>
          )}

          {step === 4 && (
            <View className="flex-1 justify-center my-6">
              <SpiceSelector 
                value={spiceLevel} 
                onChange={setSpiceLevel} 
              />
            </View>
          )}

          {step === 5 && (
            <View className="flex-1 items-center justify-center mt-4">
              <Text className="text-6xl mb-8">🎉</Text>
              <Text className="text-center font-poppins-medium text-text mt-8 px-8 text-base leading-6">
                Your profile is now customized!{"\n"}Let's start exploring{"\n"}
                <Text className="text-primary font-poppins-bold">FlavourFlow</Text> recipes & features
              </Text>
            </View>
          )}

          {/* Responsive Action Footer */}
          <View className="mt-auto pt-10">
            {step < 5 ? (
              <Button onPress={handleNext} className="w-full h-14 rounded-xl">
                Continue
              </Button>
            ) : (
              <Button onPress={handleFinish} isLoading={isLoading} className="w-full h-14 rounded-xl">
                Explore FlavourFlow
              </Button>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
