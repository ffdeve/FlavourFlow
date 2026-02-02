// Database types matching Supabase schema

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  language: 'en' | 'ur';
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  allergies: string[];
  diet_type: string | null;
  preferred_cuisines: string[];
  created_at: string;
}

export interface Recipe {
  id: string;
  title: string;
  title_urdu: string | null;
  description: string | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  image_url: string | null;
  video_url: string | null;
  cook_time: number | null;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine_type: string | null;
  diet_tags: string[];
  allergens: string[];
  created_by: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
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
  interaction_type: 'view' | 'like' | 'save' | 'cooked';
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  recipe_id: string;
  rating: number; // 1-5
  review_text: string | null;
  created_at: string;
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

export interface PostLike {
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  // Joined data
  profile?: Profile;
}

// Extended types with joined data
export interface RecipeWithDetails extends Recipe {
  profile?: Profile;
  avg_rating?: number;
  review_count?: number;
  user_interaction?: RecipeInteraction;
}

// UI State types
export type DietType = 
  | 'halal'
  | 'vegetarian'
  | 'vegan'
  | 'diabetic'
  | 'low-carb'
  | 'keto'
  | 'gluten-free';

export type CuisineType = 
  | 'pakistani'
  | 'mughlai'
  | 'punjabi'
  | 'sindhi'
  | 'balochi'
  | 'pashtun'
  | 'kashmiri';

export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface RecipeFilters {
  cuisines?: CuisineType[];
  dietTags?: DietType[];
  maxCookTime?: number;
  difficulty?: Recipe['difficulty'][];
  ingredients?: string[];
}
