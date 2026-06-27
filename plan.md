# ChefBoo Ingredient Detection & Unified Input System

## Objective

ChefBoo should automatically detect ingredients from voice input, text input, and the "What's In Your Fridge" selector, then convert all detected ingredients into a single unified ingredient chip system.

The experience should feel intelligent, lightweight, and seamless while minimizing Gemini API usage.

---

# Core Principle

Ingredient detection must happen locally using FlavourFlow's ingredient database, fuzzy search, and ingredient metadata.

Gemini should NOT be called for ingredient detection.

Gemini should only be used when ChefBoo needs to:

* answer a cooking question
* generate a recipe
* explain cooking steps
* provide ingredient substitutions
* generate responses

This keeps the application fast, lightweight, and cost-efficient.

---

# Unified Ingredient Sources

Ingredients may originate from:

1. Text Input
2. Voice Input
3. What's In Your Fridge Modal
4. Future OCR/Image Recognition
5. Future Barcode Scanner

Regardless of source, all ingredients must be normalized into the same ingredient chip container.

```text
Voice
      \
Text ----> Ingredient Engine ----> Ingredient Chips
      /
Fridge Modal

Ingredient Chips
      ↓
Recipe Search
      ↓
ChefBoo Response
```

---

# Text Input Detection

Example:

User types:

"I have tomato, eggs and rice. What can I cook?"

The text should remain visible exactly as entered.

After the user pauses typing for approximately 700–1000ms:

1. Ingredient Detector runs.
2. Ingredients are extracted.
3. Chips are generated.

Detected:

```json
[
  "tomato",
  "egg",
  "rice"
]
```

Displayed:

```text
🍅 Tomato
🥚 Egg
🍚 Rice
```

The original prompt remains unchanged.

---

# Voice Input Detection

## Step 1 — Speech Recognition

User taps microphone.

Example speech:

"I have tomato, eggs, onion and cheese."

Real-time speech-to-text displays:

```text
I have tomato, eggs, onion and cheese
```

---

## Step 2 — Ingredient Extraction

After a short silence or debounce period:

Ingredient Detector runs.

Detected:

```json
[
  "tomato",
  "egg",
  "onion",
  "cheese"
]
```

---

## Step 3 — Progressive Animation

Do not instantly replace text.

Instead:

```text
I have tomato, eggs, onion and cheese
```

↓

```text
I have [tomato], eggs, onion and cheese
```

↓

```text
I have [tomato], [eggs], onion and cheese
```

↓

```text
I have [tomato], [eggs], [onion], cheese
```

↓

```text
I have [tomato], [eggs], [onion], [cheese]
```

Each detected ingredient performs a small pop-out animation.

---

## Step 4 — Chip Generation

After animation completes:

Ingredient chips appear.

```text
🍅 Tomato ✕
🥚 Egg ✕
🧅 Onion ✕
🧀 Cheese ✕
```

Users can:

* remove ingredients
* add ingredients
* continue typing
* continue speaking

---

# Ingredient Chips

All ingredient chips should appear in the same area already used by the "What's In Your Fridge" feature.

Example:

```text
🥚 Egg
🧅 Onion
🍅 Tomato
🍚 Rice
```

This creates one unified ingredient state across the entire chatbot.

---

# Fridge Modal Integration

Fridge Modal remains available through:

```text
src/assets/icons/fridge.webp
```

Users may manually select ingredients.

Selected ingredients are inserted directly into the same chip container.

Example:

```text
🥚 Egg
🧅 Onion
```

---

# Chip Merging Logic

Automatically merge ingredients from all sources.

Example:

User selects:

```text
🥚 Egg
🧅 Onion
```

Then types:

```text
I also have tomato and rice
```

Detected:

```text
🍅 Tomato
🍚 Rice
```

Final state:

```text
🥚 Egg
🧅 Onion
🍅 Tomato
🍚 Rice
```

Duplicate ingredients must never be added.

---

# Ingredient Engine

Use:

* ingredients table
* ingredient icons
* ingredient metadata
* fuzzy search

Ingredient icons are loaded from storage and mapped to ingredient records.

Example:

```json
{
  "id": 1,
  "name": "Egg",
  "icon": "egg.webp"
}
```

No AI processing required.

---

# Internal State

User prompt:

```text
I have tomato, eggs and rice.
```

Internal state:

```json
{
  "message": "I have tomato, eggs and rice.",
  "selectedIngredients": [
    "tomato",
    "egg",
    "rice"
  ]
}
```

When user presses Send:

```json
{
  "prompt": "I have tomato, eggs and rice.",
  "selectedIngredients": [
    "tomato",
    "egg",
    "rice"
  ]
}
```

Both values are sent to ChefBoo.

---

# Recipe Search Flow

When a message is submitted:

```text
Prompt
+
Selected Ingredients
+
User Preferences
+
Dietary Preferences
+
Allergies
+
Past Interactions
↓
Recipe Search
↓
Recommendation Ranking
↓
ChefBoo Response
```

---

# Personalization Requirements

Ingredient matching alone is not enough.

ChefBoo must always consider:

* user preferences
* favorite cuisines
* preferred countries
* spice level
* allergies
* dietary preferences
* disliked ingredients
* favorite recipes
* completed cooking sessions
* recommendation engine results

Any recipe that conflicts with allergies, dietary restrictions, or disliked ingredients must be filtered or heavily penalized before being shown.

---

# Performance Requirements

Do NOT send every keystroke to Gemini.

Never do:

```text
t
to
tom
toma
tomat
tomato
```

→ Gemini API

This wastes tokens and increases latency.

Instead:

```text
User typing
      ↓
700–1000ms pause
      ↓
Local Ingredient Detection
      ↓
Chip Generation
```

Only after the user submits the message should ChefBoo invoke Gemini if needed.

---

# Final Goal

ChefBoo should behave like an intelligent cooking companion that automatically understands ingredients from typing, voice, and fridge selections, converts them into unified ingredient chips, respects user preferences and dietary restrictions, searches FlavourFlow recipes first, and only uses Gemini when a true AI response or recipe generation is required.

The entire system must remain lightweight, responsive, scalable, and optimized for minimal API usage.

OR 

This is a very good technical design. I would merge it into your ChefBoo specification like this so Claude/Gemini understands exactly how the system should work while keeping FlavourFlow lightweight.

---

# ChefBoo Ingredient Detection & Unified Ingredient System

## Objective

ChefBoo should intelligently detect ingredients from:

1. Text Input
2. Voice Input
3. What's In Your Fridge Modal

All ingredient sources must feed into a single unified ingredient system and produce the same ingredient chips shown above the chat input.

The goal is to make ingredient selection feel natural and automatic while keeping the application lightweight and minimizing AI token usage.

---

# Unified Ingredient Pipeline

All ingredient sources flow through the same engine.

```text
Voice Input
      \
Text Input ----> Ingredient Engine
      /
Fridge Modal

↓

Unified Ingredient Store

↓

Recipe Search

↓

ChefBoo Response
```

Regardless of how ingredients are provided, they should end up in the same ingredient chip container.

---

# Ingredient Detection Sources

## Source 1: Fridge Modal

User taps:

```text
src/assets/icons/fridge.webp
```

The Ingredient Selector modal opens.

Ingredients are selected manually.

Example:

```text
🥚 Egg
🧅 Onion
🍚 Rice
```

These become selected ingredient chips.

---

## Source 2: Text Detection

Example:

```text
I have tomato, eggs and rice.
What can I cook?
```

After the user pauses typing:

```text
700-1000ms debounce
```

ChefBoo runs local ingredient detection.

Detected:

```json
[
  "tomato",
  "egg",
  "rice"
]
```

Ingredient chips appear:

```text
🍅 Tomato
🥚 Egg
🍚 Rice
```

The original text remains unchanged.

---

## Source 3: Voice Detection

User taps microphone.

Example speech:

```text
I have tomato, eggs, onion and cheese
```

Speech-to-text converts audio into text.

During speech:

```text
I have tomato, eggs, onion and cheese
```

appears normally.

After speech ends:

```text
700-1000ms delay
```

Ingredient detection runs.

Detected ingredients become chips.

---

# Progressive Detection Animation

Detected ingredients should not instantly transform.

Instead:

### Step 1

User sees:

```text
I have tomato, eggs, onion and cheese
```

### Step 2

Ingredient detection begins.

Detected words receive a brief highlight animation.

Example:

```text
I have [tomato], eggs, onion and cheese
```

Then:

```text
I have [tomato], [eggs], onion and cheese
```

Then:

```text
I have [tomato], [eggs], [onion], cheese
```

Then:

```text
I have [tomato], [eggs], [onion], [cheese]
```

### Step 3

Each highlighted ingredient performs a small pop animation:

```text
Scale:
1.0 → 1.15 → 1.0
```

### Step 4

Ingredient chips appear above the chat input.

Example:

```text
🍅 Tomato
🥚 Egg
🧅 Onion
🧀 Cheese
```

This creates a premium AI experience without needing additional AI calls.

---

# Local Ingredient Engine

Ingredient detection must run locally.

Do NOT call Gemini for ingredient extraction.

Use:

```text
Supabase Ingredients Table
+
Fuzzy Search
+
Local Parsing Logic
```

This keeps the application fast and inexpensive.

---

# Ingredient Matching Logic

## Step 1: Clean Text

Convert:

```text
I have Tomato, Eggs and Rice.
```

to:

```text
tomato eggs rice
```

Remove:

```text
i
have
and
with
a
the
```

---

## Step 2: Multi-Word Matching

Support ingredients such as:

```text
parmesan cheese
olive oil
soy sauce
red chili flakes
```

Use a sliding-window tokenizer.

Check:

```text
3-word matches
2-word matches
1-word matches
```

in that order.

---

## Step 3: Fuzzy Matching

Support:

```text
egg → eggs
tomato → tomatos
tomto → tomato
```

Use existing fuzzy search already implemented in FlavourFlow.

---

# Ingredient Icons

Ingredient icons come from:

```text
Supabase Storage
```

Example:

```json
{
  "id": "12",
  "name": "Egg",
  "icon": "egg.webp"
}
```

These icons are used for all ingredient chips.

---

# Unified Ingredient State

Use a single global ingredient state.

Example:

```text
selectedIngredients
```

All sources update this same state.

Sources:

```text
Fridge Modal
Text Detection
Voice Detection
```

must never create separate ingredient lists.

---

# Duplicate Prevention

Ingredients must merge automatically.

Example:

User selected:

```text
🥚 Egg
🧅 Onion
```

User then types:

```text
I also have eggs, tomato and rice.
```

Detected:

```text
🥚 Egg
🍅 Tomato
🍚 Rice
```

Final state:

```text
🥚 Egg
🧅 Onion
🍅 Tomato
🍚 Rice
```

No duplicate egg chip should appear.

---

# Multi-Language Support

Real-time ingredient detection remains English-only for performance.

Examples:

```text
egg
tomato
rice
onion
```

are detected instantly.

However, when the user presses Send:

```text
anda
dhaniya
aloo
```

or

```text
بيض
بطاطا
كزبرة
```

Gemini can understand these terms and map them correctly during recipe generation.

This avoids building a large multilingual ingredient parser while still supporting multilingual users.

---

# Recipe Search Flow

When Send is pressed:

ChefBoo receives:

```json
{
  "message": "I have tomato, eggs and rice. What can I cook?",
  "selectedIngredients": [
    "tomato",
    "egg",
    "rice"
  ]
}
```

---

# Backend Processing

ChefBoo must:

### Step 1

Apply user profile filters:

```text
Allergies
Dislikes
Dietary Preferences
Spice Preferences
```

These rules are mandatory and must always override recipe matching.

---

### Step 2

Search FlavourFlow recipes.

Rank using:

```text
Ingredient Match
+
Recommendation Score
+
User Preferences
+
Behavior Score
```

---

### Step 3

If recipes exist:

Show AI Recipe Carousel.

Example:

```text
Chicken Fried Rice
Egg Fried Rice
Tomato Rice Bowl
```

Allow:

```text
Open Recipe
Save Recipe
Start Cooking
```

directly from chat.

---

### Step 4

If no suitable recipe exists:

ChefBoo generates a recipe using Gemini.

Never tell users:

```text
No recipe found in database.
```

Instead:

```text
Here's a recipe you can try using those ingredients.
```

---

# Performance Requirements

ChefBoo must remain lightweight.

Ingredient detection should:

```text
Run locally
Use ingredient table
Use fuzzy search
Use debounce
```

Gemini should only be called when:

```text
Generating a response
Generating a recipe
Answering cooking questions
Providing cooking guidance
```

Gemini must never be called for:

```text
Every keystroke
Ingredient extraction
Ingredient chip creation
Typing detection
```

This keeps token usage low and follows the same architecture used by many production AI food applications.

---

# Final Result

ChefBoo behaves like an intelligent cooking companion:

* Detects ingredients automatically from text, voice, or fridge selections.
* Shows ingredient chips in one unified area.
* Respects allergies, dislikes, dietary preferences, and spice preferences before recommending recipes.
* Searches FlavourFlow recipes first.
* Uses Gemini only when conversation or recipe generation is required.
* Remains fast, lightweight, scalable, and cost-efficient.
