// Database types matching Supabase schema

// ============= USER & PROFILE =============
export interface User {
  user_id: string; // UUID from auth.users
  name: string;
  email: string;
  password: string; // hashed
  role: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  language: "en" | "ur";
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  preference_id: number;
  user_id: string;
  diet_type: string | null;
  allergies: string;
  cuisine_type: string;
  created_at: string;
}

// ============= INGREDIENTS & RECIPES =============
export interface Ingredient {
  ingredient_id: number;
  name: string;
  name_urdu?: string | null;
  category?: string | null;
  created_at: string;
}

export interface RecipeIngredientBridge {
  recipe_ingredient_id: number;
  recipe_id: number;
  ingredient_id: number;
  quantity: string;
  is_optional: boolean;
  created_at: string;
}

export interface Recipe {
  recipe_id: number;
  title: string;
  description: string | null;
  difficulty_level: "easy" | "medium" | "hard";
  cooking_time: number | null; // in minutes
  created_by: string | null; // user_id
  created_at: string;
  updated_at: string;
  // Additional fields for app usage
  title_urdu?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  cuisine_type?: string | null;
  diet_tags?: string[];
  allergens?: string[];
  is_verified?: boolean;
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  name_urdu?: string;
}

export interface RecipeStep {
  step: number;
  instruction: string;
  instruction_urdu?: string;
  duration?: number; // in minutes
  image_url?: string;
}

// ============= RATINGS & FEEDBACK =============
export interface Rating {
  rating_id: number;
  user_id: string;
  recipe_id: number;
  stars: number; // 1-5
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  feedback_id: number;
  user_id: string;
  recipe_id: number;
  comment: string;
  created_at: string;
}

export interface PantryItem {
  id: string;
  user_id: string;
  ingredient_name: string;
  added_at: string;
}

export interface RecipeInteraction {
  id: string;
  user_id: string;
  recipe_id: string;
  interaction_type: "view" | "like" | "save" | "cooked";
  created_at: string;
}

// ============= COOKING SESSIONS =============
export interface CookingSession {
  session_id: number;
  user_id: string;
  recipe_id: number;
  start_time: string;
  end_time: string | null;
  current_step: number;
  is_completed: boolean;
  notes: string | null;
}

// ============= RECOMMENDATIONS =============
export interface RecipeRecommendation {
  recommendation_id: number;
  user_id: string;
  recipe_id: number;
  score: number; // 0.0 to 1.0
  generated_at: string;
  reason?: string | null;
  is_viewed: boolean;
  viewed_at: string | null;
}

// ============= APPLICATION SETTINGS =============
export interface ApplicationSettings {
  setting_id: number;
  user_id: string;
  theme: "light" | "dark" | "auto";
  language: "en" | "ur";
  notification_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  recipe_id: string;
  rating: number; // 1-5
  review_text: string | null;
  created_at: string;
}

// ============= COMMUNITY / SOCIAL =============
export interface CommunityPost {
  post_id: number;
  user_id: string;
  content: string;
  created_at: string;
  // Additional fields
  image_url?: string | null;
  likes_count?: number;
  comments_count?: number;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  // Joined data
  profile?: Profile;
}

export interface Like {
  like_id: number;
  user_id: string;
  post_id: number;
  created_at: string;
}

export interface PostLike {
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Comment {
  comment_id: number;
  user_id: string;
  post_id: number;
  text: string;
  created_at: string;
  // Joined data
  profile?: Profile;
}

// ============= EXTENDED TYPES =============
export interface RecipeWithDetails extends Recipe {
  profile?: Profile;
  avg_rating?: number;
  review_count?: number;
  user_interaction?: RecipeInteraction;
  ingredients_list?: RecipeIngredientBridge[];
  steps?: RecipeStep[];
}

// ============= UI STATE TYPES =============
export type DietType =
  | "halal"
  | "vegetarian"
  | "vegan"
  | "diabetic"
  | "low-carb"
  | "keto"
  | "gluten-free";

export type CuisineType =
  | "pakistani"
  | "mughlai"
  | "punjabi"
  | "sindhi"
  | "balochi"
  | "pashtun"
  | "kashmiri";

export type MealTime = "breakfast" | "lunch" | "dinner" | "snack";

export interface RecipeFilters {
  cuisines?: CuisineType[];
  dietTags?: DietType[];
  maxCookTime?: number;
  difficulty?: Recipe["difficulty"][];
  ingredients?: string[];
}
