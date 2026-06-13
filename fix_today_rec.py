import re

with open('src/app/(tabs)/index.tsx', 'r') as f:
    content = f.read()

# 1. Ensure RecommendationCard is imported
if 'RecommendationCard' not in content:
    content = content.replace(
        'import { PopularRecipeCard } from "@/components/ui/popular-recipe-card";',
        'import { PopularRecipeCard } from "@/components/ui/popular-recipe-card";\nimport { RecommendationCard } from "@/components/ui/recommendation-card";'
    )

# 2. Replace PopularRecipeCard loop in Today's Recommendation section with RecommendationCard
old_loop = """            {/* Recommended Recipes Carousel */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, alignItems: 'center' }}
              className="mt-2"
            >
              {recommendedRecipes.map((recipe) => (
                <PopularRecipeCard
                  key={recipe.id}
                  title={recipe.title}
                  time={recipe.time}
                  spiceLevel={recipe.spiceLevel}
                  image={recipe.image}
                  onPress={() => console.log("Press", recipe.title)}
                />
              ))}"""

new_loop = """            {/* Recommended Recipes Carousel */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, alignItems: 'center' }}
              className="mt-2"
            >
              {recommendedRecipes.map((recipe) => (
                <RecommendationCard
                  key={recipe.id}
                  recipe={recipe}
                  isLiked={favorites.has(recipe.id)}
                  onToggleFavorite={() => handleToggleFavorite(recipe.id)}
                  onPress={() => router.push(`/recipe-detail?id=${recipe.id}`)}
                />
              ))}"""

content = content.replace(old_loop, new_loop)

with open('src/app/(tabs)/index.tsx', 'w') as f:
    f.write(content)
