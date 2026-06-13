import re

with open('src/app/(tabs)/index.tsx', 'r') as f:
    content = f.read()

# 1. Add imports
content = content.replace(
    'import { router } from "expo-router";',
    'import { router } from "expo-router";\nimport { Recipe, recipeService } from "@/services/recipe.service";\nimport { Image } from "expo-image";'
)

# 2. Add state and useEffects
state_block = """  const [selectedCategory, setSelectedCategory] = useState(getDefaultCategory());
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const [featuredRecipes, setFeaturedRecipes] = useState<Recipe[]>([]);
  const [recommendedRecipes, setRecommendedRecipes] = useState<Recipe[]>([]);
  const [popularRecipes, setPopularRecipes] = useState<Recipe[]>([]);
  const [cookAgainRecipes, setCookAgainRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        const [featured, popular, trending, dbCategories] = await Promise.all([
          recipeService.getFeaturedRecipes(5),
          recipeService.getPopularRecipes(10),
          recipeService.getTrendingRecipes(10),
          recipeService.getCategories(),
        ]);
        setFeaturedRecipes(featured);
        setPopularRecipes(popular);
        setCookAgainRecipes(trending);
        setCategories(dbCategories);
      } catch (err) {
        console.error("Failed to load homepage recipes from database:", err);
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, []);

  useEffect(() => {
    let active = true;
    const loadRecommendations = async () => {
      try {
        setRecLoading(true);
        const recommended = await recipeService.getRecommendedRecipes(selectedCategory, 10);
        if (active) setRecommendedRecipes(recommended);
      } catch (err) {
        console.error("Failed to load category recommendations:", err);
      } finally {
        if (active) setRecLoading(false);
      }
    };
    loadRecommendations();
    return () => { active = false; };
  }, [selectedCategory]);

  useEffect(() => {
    if (profile?.id) {
      recipeService.getLikedRecipeIds(profile.id).then(setLikedIds).catch(console.error);
    }
  }, [profile?.id]);

  const handleToggleFavorite = async (recipeId: string) => {
    if (!profile?.id) return;
    try {
      const isLiked = await recipeService.toggleLikeRecipe(profile.id, recipeId);
      setLikedIds(prev => {
        const next = new Set(prev);
        if (isLiked) next.add(recipeId);
        else next.delete(recipeId);
        return next;
      });
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };"""

content = re.sub(
    r'  const \[selectedCategory.*?setActivePromoIndex.*?;\n',
    state_block + '\n',
    content,
    flags=re.DOTALL
)

# 3. Fix the icons in header (the user's previous request)
content = content.replace(
    '<Feather name="box" size={22} color="#FFFFFF" />',
    '<Image source={require("@/assets/icons/fridge.webp")} style={{ width: 26, height: 26 }} contentFit="contain" />'
)
content = content.replace(
    '<Feather name="heart" size={22} color="#FFFFFF" />',
    '<Image source={require("@/assets/icons/heart_filled.webp")} style={{ width: 26, height: 26 }} contentFit="contain" />'
)

with open('src/app/(tabs)/index.tsx', 'w') as f:
    f.write(content)
