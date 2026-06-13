# FlavourFlow Design System & UI Style Guide

This guide documents the core styling rules, visual tokens, and interface design patterns implemented across the FlavourFlow mobile application to maintain a consistent, premium, and visually stunning aesthetic.

---

## 1. Color Palette

FlavourFlow uses a warm, cozy, culinary-focused palette that avoids default primary colors and leverages soft pastel tints and deep text contrasts.

| Token Name             | Hex Code  | Visual Preview / Tailwind Class | Primary Usage                                                  |
| ---------------------- | --------- | ------------------------------- | -------------------------------------------------------------- |
| **Primary Golden**     | `#FBA82E` | `bg-primary` / `text-primary`   | Main buttons, active pills, indicators, high-contrast actions. |
| **Cream Background**   | `#FAF5EF` | `bg-[#FAF5EF]`                  | Standard page background (e.g., Recipe Details).               |
| **Pale Yellow/Cream**  | `#FFFDF5` | `bg-[#FFFDF5]`                  | Screen background fallback (e.g., Category Details, tabs).     |
| **Soft Peach**         | `#F5E3D8` | `bg-[#F5E3D8]`                  | Container cards, border outlines, input fields.                |
| **Dark Charcoal**      | `#3B3328` | `text-[#3B3328]`                | Primary text headings, body text, readable blocks.             |
| **Text Secondary**     | `#8B7D6F` | `text-text-secondary`           | Subtitle descriptions, secondary metadata labels.              |
| **Primary Red Accent** | `#E05252` | `text-[#E05252]`                | Toggle hearts, warnings, delete actions.                       |

---

## 2. Typography

All screens must use the project's loaded Google Fonts instead of default browser/system sans-serif fonts:

| Font Name                       | Native Tailwind Class    | Best Used For                                  |
| ------------------------------- | ------------------------ | ---------------------------------------------- |
| **Plus Jakarta Sans Bold**      | `font-jakarta-bold`      | Screen titles, product headers, major accents. |
| **Plus Jakarta Sans SemiBold**  | `font-jakarta-semibold`  | Subheadings, button text, card titles.         |
| **Plus Jakarta Sans ExtraBold** | `font-jakarta-extrabold` | Numbers, large statistics values.              |
| **Inter Medium**                | `font-inter-medium`      | Small metadata, clock timers, badge labels.    |
| **Inter Regular**               | `font-inter-regular`     | General description body paragraphs.           |
| **Poppins SemiBold**            | `font-poppins-semibold`  | High-impact text overlay titles.               |

---

## 3. UI Component Patterns

### A. Rounded Cards

All recipe grids and list elements must use a highly rounded border scheme:

- Grid Cards: Use exactly `rounded-3xl` with a soft cream/peach border outline (`border border-[#F5E3D8]/30`) and a subtle bottom shadow:
  ```typescript
  style={{
    shadowColor: "#3B3328",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  }}
  ```

### B. Inline Rating & Timer Overlays

- **Rating overlay**: Placed at the top-right corner of card images inside a translucent pill:
  `bg-black/45 px-2 py-0.5 rounded-full flex-row items-center backdrop-blur-md`
- **Cook time overlay**: Placed at the bottom-left corner of card images inside a translucent clock pill:
  `bg-black/50 px-2 py-0.5 rounded-full flex-row items-center backdrop-blur-md`

### C. Category Banner Gradients

Each mealtime category has a unique linear gradient color scheme representing its mood. Render banners using `expo-linear-gradient`:

```typescript
const CATEGORY_INFOS = {
  All: { colors: ["#FBA82E", "#F47C20"] }, // Golden/Orange
  Breakfast: { colors: ["#FBA82E", "#F3A152"] }, // Sunny Amber
  Lunch: { colors: ["#3BB17A", "#1D8B55"] }, // Energizing Mint Green
  Dinner: { colors: ["#4F5CD8", "#2E3A9E"] }, // Indigo/Night Blue
  "Midnight Snack": { colors: ["#1F1C2C", "#928DAB"] }, // Late Night Violet
  "Quick Bites": { colors: ["#E05252", "#9C2727"] }, // Spicy Coral/Red
};
```

---

## 4. Custom Icon Assets

### A. Spice Levels (Single Asset Icon)

Do **not** repeat emojis for spice level. Instead, map the integer to its corresponding PNG file from `/assets/icons/spice_X.png`:

```typescript
const SPICE_IMAGES = {
  1: require("@/assets/icons/spice_1.png"),
  2: require("@/assets/icons/spice_2.png"),
  3: require("@/assets/icons/spice_3.png"),
  4: require("@/assets/icons/spice_4.png"),
  5: require("@/assets/icons/spice_5.png"),
};
```

Display it using a single image of size `w-5 h-5`.

### B. Summary Indicators (48x48 Blocks)

Details pages must show three indicators for recipe metadata. These cards use a colored tint container (not a circular white background) with the icon at `48x48` dimensions:

1. **Ingredients**: Background `#FFF2D9` (warm yellow) | Icon: `require("@/assets/icons/Ingredients.webp")`
2. **Calories**: Background `#FFEAD2` (warm peach) | Icon: `require("@/assets/icons/kcal.png")`
3. **Servings**: Background `#FDF0EB` (light orange) | Icon: `require("@/assets/icons/servings.png")`

---

## 5. Floating Swipeable CTA Button

The bottom navigation "Start Cooking" button is swipe-activated to prevent accidental taps and enhance interactive micro-animations.

- **Rounding**: Track and Knob must use `rounded-2xl` (less rounded rectangle styling, NOT full pill-shaped).
- **Background**: Floats cleanly directly on top of instructions; do **not** overlay a white/cream linear gradient behind the track.
- **Knob Icon**: Must render a long arrow icon pointing to the right (`long-arrow-right` from `FontAwesome`).
- **Confirmation Action**: Sliding the knob past `90%` of the track triggers `onSwipeSuccess` which pops a dialog. The slider then spring-returns back to index `0` cleanly.

---

## 6. Wizard Forms & Screen Presentations

To ensure multi-step forms and wizards feel interactive, premium, and native:

### A. Full-Screen Page Modal Layouts

- **Presentation Option**: Set `presentation: "fullScreenModal"` in stack screen configurations.
- **Top Header**: Use a transparent layout header with a close icon `X` on the left, centered bold text, and a matching spacer on the right (`w-10 h-10`) to keep the title perfectly centered. Avoid showing cluttered progress steps at the very top.
- **Organic Screen Blobs**: Use soft-peach organic background shapes (`bg-[#F5E3D8]/45`) placed absolutely inside the `ScrollView` (not at the root view level) with `pointerEvents="none"` to allow touches to pass through and ensure they scroll naturally along with the page content rather than remaining fixed. To prevent clipping against padding edges, place the absolute background shape directly inside the `ScrollView`'s child container (which should have zero padding), and wrap the actual page text/content in a nested container with the required padding.

### B. Custom Floating Badge Inputs

- **Layout**: Style inputs with a floating badge label centered on the top-left container border:
  - Badge container: `bg-[#FFF5EE] px-2 py-0.5 rounded-lg border border-[#FBA82E]/30 absolute -top-3 left-4 z-10`.
  - TextInput: `bg-white rounded-2xl p-4 border border-[#F5E3D8]/50 text-sm font-jakarta-medium`.

### C. Connected Bottom Progress Navigation

- **Progress Line**: Render a thin horizontal line (`h-1 bg-[#F5E3D8]/40 rounded-full`) across the full width of the bottom bar, with a sliding track (`bg-[#FBA82E]`) indicating the step progress.
- **Back Control**: A soft circular button (`w-14 h-14 bg-[#F5E3D8]/30 rounded-full`) with a grey chevron (`chevron-left`, `color="#8B7D6F"`), visible on steps > 1.
- **Forward Control**: A wide pill-shaped orange button displaying `"Next"` accompanied by an arrow icon (like Feather's `arrow-right` at size 18, color `#FFFFFF`) or `"Publish Recipe"` on the final step, taking up the remaining width.

### D. Step 2 Metadata Counters & Selectors

- **Servings & Time Counter Cards**: Use rounded cards (`bg-[#F5E3D8]/25` with `rounded-[24px]` and border `border-[#F5E3D8]/45`) containing a clean title, descriptive label, and interactive counter controls.
  - **Preparation & Cooking Times**: Counter controls modify the value by `+1` or `-1`. The value text displays inside an editable `TextInput` with `keyboardType="number-pad"` next to a static `"min"` label, allowing manual typing.
  - **Servings**: Displays the utensils icon asset (`@/assets/icons/servings.png`) in a soft backdrop. Counter controls modify the value by `+1` or `-1`, but the value is displayed as read-only static text (no manual typing allowed).
- **Spice Level Interactive Icons**: Render five custom pepper icons horizontally. Active selection scales up to width/height `46` (fully opaque), whereas unselected ones scale down to `30` (`opacity: 0.45`). Include a warning caption advising the user to set an accurate level.
- **Dietary Tags Wrap Grid (Optional)**: Display tag selections as rounded pills (`rounded-full px-4 py-2.5 mr-2.5 mb-2.5 border`) inside a flex-wrap container:
  - **Selected tag**: `bg-[#FBA82E] border-transparent text-white` with a matching white icon.
  - **Unselected tag**: `bg-white border-[#F5E3D8]/50 text-[#3B3328]` with a secondary grey icon.
  - **Configuration**: Include tags like `"Vegetarian"`, `"Vegan"`, `"Gluten-Free"`, `"Dairy-Free"`, `"Keto"`, `"Non-Halal"` (instead of Halal), `"Low-Carb"`, and `"Nut-Free"`. Mark the section header clearly with an `(Optional)` label.
