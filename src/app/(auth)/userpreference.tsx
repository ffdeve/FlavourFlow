import AnimatedSearchBar from "@/components/ui/animated-search-bar";
import { BrickWallCarousel } from "@/components/ui/brick-wall-carousel";
import { DiamondChip } from "@/components/ui/diamond-chip";
import { Button } from "@/components/ui/button";
import SpiceSelector from "@/components/ui/spice-selector";
import { profileService } from "@/services/profile.service";
import { useAuthStore } from "@/store/auth.store";
import type { CuisineItem } from "@/types";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserPreferenceScreen() {
  const { updatePreferences, markPreferencesComplete, signOut } = useAuthStore();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // DB catalog lists
  const [countries, setCountries] = useState<CuisineItem[]>([]);
  const [allCuisines, setAllCuisines] = useState<CuisineItem[]>([]);
  const [allergies, setAllergies] = useState<CuisineItem[]>([]);

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
        if (dbCuisines.length > 0) setAllCuisines(dbCuisines);
        if (dbAllergens.length > 0) setAllergies(dbAllergens);
      } catch (err) {
        console.warn("Could not load dynamic DB catalog:", err);
      }
    }
    loadCatalog();
  }, []);

  // Show all cuisines regardless of country selection for now
  // Further filter cuisines by search query
  const searchedCuisines = useMemo(() => {
    // Only show items that have an icon_url
    const availableCuisines = allCuisines.filter(c => c.icon_url);
    if (!searchQuery.trim()) return availableCuisines;
    
    const q = searchQuery.toLowerCase();
    return availableCuisines.filter((c) => {
      const name = c.name || "";
      const nameUrdu = c.name_urdu || "";
      return name.toLowerCase().includes(q) || nameUrdu.toLowerCase().includes(q);
    });
  }, [allCuisines, searchQuery]);

  // Filter allergies by search query
  const searchedAllergies = useMemo(() => {
    // Only show items that have an icon_url
    const availableAllergies = allergies.filter(a => a.icon_url);
    if (!searchQuery.trim()) return availableAllergies;
    
    const q = searchQuery.toLowerCase();
    return availableAllergies.filter((a) => {
      const name = a.name || "";
      const nameUrdu = a.name_urdu || "";
      return name.toLowerCase().includes(q) || nameUrdu.toLowerCase().includes(q);
    });
  }, [allergies, searchQuery]);

  const toggleSelection = (
    item: string,
    currentSelection: string[],
    setSelection: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setSelection((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  // Clear search query when navigating steps
  const goToStep = (nextStep: number) => {
    setSearchQuery("");
    setStep(nextStep);
  };

  const handleNext = () => {
    if (step === 1 && selectedCountries.length < 1) {
      Alert.alert("Requirement", "Please select at least 1 Country.");
      return;
    }
    if (step === 2 && selectedCuisines.length < 3) {
      Alert.alert("Requirement", "Please select at least 3 cuisines.");
      return;
    }
    if (step < 5) {
      goToStep(step + 1);
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
                    goToStep(step - 1);
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
                  Your Favourite{"\n"}Dishes/Cuisines?
                </Text>
                <Text className="text-text-secondary font-poppins-light text-sm mt-1">
                  Select At-least 3 Options
                </Text>
              </View>
            )}

            {step === 3 && (
              <View>
                <Text className="text-4xl text-primary font-poppins-semibold leading-tight">
                  Any Allergies?
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
                  <TouchableOpacity onPress={() => goToStep(4)} className="mb-4 w-10 h-10 items-center justify-center bg-black/5 rounded-full">
                    <Text className="text-xl text-text font-bold">←</Text>
                  </TouchableOpacity>
                  <Text className="text-4xl text-primary font-poppins-semibold leading-tight">
                    Setup{"\n"}Completed
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Step 1: Countries */}
          {step === 1 && (
            <BrickWallCarousel
              data={countries}
              isFlag={true}
              selectedItems={selectedCountries}
              toggleSelection={toggleSelection}
              setSelectedItems={setSelectedCountries}
            />
          )}

          {/* Step 2: Cuisines filtered by selected countries + search */}
          {step === 2 && (
            <View className="flex-1">
              <AnimatedSearchBar 
                value={searchQuery} 
                onChangeText={setSearchQuery} 
                placeholder="Search cuisines..." 
              />
              {searchQuery.trim().length > 0 ? (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  className="mt-6 pb-12"
                  contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                  <View className="flex-row items-center">
                    {searchedCuisines.map((item) => (
                      <View key={item.id} className="mr-4">
                        <DiamondChip
                          label={item.name || ""}
                          isFlag={false}
                          isSelected={selectedCuisines.includes(item.name || "")}
                          onPress={() => toggleSelection(item.name || "", selectedCuisines, setSelectedCuisines)}
                          imageUrl={item.icon_url}
                        />
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <BrickWallCarousel
                  data={searchedCuisines}
                  isFlag={false}
                  selectedItems={selectedCuisines}
                  toggleSelection={toggleSelection}
                  setSelectedItems={setSelectedCuisines}
                />
              )}
            </View>
          )}

          {/* Step 3: Allergies to ingredients + search */}
          {step === 3 && (
            <View className="flex-1">
              <AnimatedSearchBar 
                value={searchQuery} 
                onChangeText={setSearchQuery} 
                placeholder="Search allergies..." 
              />
              {searchQuery.trim().length > 0 ? (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  className="mt-6 pb-12"
                  contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                  <View className="flex-row items-center">
                    {searchedAllergies.map((item) => (
                      <View key={item.id} className="mr-4">
                        <DiamondChip
                          label={item.name || ""}
                          isFlag={false}
                          isSelected={selectedAllergies.includes(item.name || "")}
                          onPress={() => toggleSelection(item.name || "", selectedAllergies, setSelectedAllergies)}
                          imageUrl={item.icon_url}
                        />
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <BrickWallCarousel
                  data={searchedAllergies}
                  isFlag={false}
                  selectedItems={selectedAllergies}
                  toggleSelection={toggleSelection}
                  setSelectedItems={setSelectedAllergies}
                />
              )}
            </View>
          )}

          {/* Step 4: Spice level with custom icons */}
          {step === 4 && (
            <View className="flex-1 justify-center my-6">
              <SpiceSelector 
                value={spiceLevel} 
                onChange={setSpiceLevel} 
              />
            </View>
          )}

          {/* Responsive Action Footer */}
          <View className="mt-auto pt-10">
            {step < 4 ? (
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
