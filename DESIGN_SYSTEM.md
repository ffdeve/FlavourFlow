# FlavourFlow Design System

## Color Palette

### Primary - Golden Yellow

Main brand color used for CTAs, active states, and key UI elements.

- **Primary**: `#FBA82E`
- **Primary Light**: `#FCC368`
- **Primary Dark**: `#E39620`

**Usage:**

- Primary buttons
- Active tab indicators
- Key action buttons
- Accent elements

```tsx
// Tailwind classes
className = "bg-primary text-white";
className = "text-primary";
className = "border-primary";

// Direct usage
import { Colors } from "@/constants/colors";
backgroundColor: Colors.primary.DEFAULT;
```

---

### Background - Cream

App background and surface colors.

- **Background**: `#FCF0D6`
- **Background Light**: `#FEFBF2`
- **Background Dark**: `#F5E4C0`
- **Paper (Cards)**: `#FFFFFF`

**Usage:**

- Main app background
- Screen backgrounds
- Light surfaces

```tsx
className = "bg-background";
className = "bg-white"; // for elevated cards
```

---

### Interactive - Darker Cream

Used for input fields, interactive surfaces, and hover states.

- **Interactive**: `#EDD8A9`
- **Interactive Light**: `#F2E3C0`
- **Interactive Dark**: `#E3CC92`

**Usage:**

- Input field backgrounds
- Dropdown backgrounds
- Hover states
- Secondary surfaces

```tsx
className = "bg-interactive";
className = "bg-interactive-dark"; // hover/pressed
```

---

### Text - Dark Brown

All text colors from primary to disabled states.

- **Text Primary**: `#3B3328`
- **Text Secondary**: `#6B5D4F`
- **Text Tertiary**: `#8B7D6F`
- **Text Disabled**: `#B5A99A`

**Usage:**

- Primary text: Headings, body text
- Secondary: Subtitles, descriptions
- Tertiary: Captions, hints
- Disabled: Inactive elements

```tsx
className = "text-text"; // primary
className = "text-text-secondary";
className = "text-text-tertiary";
```

---

### Semantic Colors

**Success**: `#4CAF50` - Confirmations, success messages  
**Error**: `#EF4444` - Errors, destructive actions  
**Warning**: `#F59E0B` - Warnings, alerts  
**Info**: `#3B82F6` - Informational messages

```tsx
className = "text-success";
className = "bg-error";
className = "border-warning";
```

---

## Typography

### Font Family: Poppins

All text uses the **Poppins** font family with various weights:

- **Light (300)**: Subtle, elegant text
- **Regular (400)**: Body text, paragraphs
- **Medium (500)**: Emphasized text, labels
- **SemiBold (600)**: Subheadings, important labels
- **Bold (700)**: Headings, titles

### Font Sizes

| Size | Value | Line Height | Usage                      |
| ---- | ----- | ----------- | -------------------------- |
| xs   | 12px  | 16px        | Small labels, captions     |
| sm   | 14px  | 20px        | Secondary text, labels     |
| base | 16px  | 24px        | Body text (default)        |
| lg   | 18px  | 28px        | Large body, small headings |
| xl   | 20px  | 28px        | Section titles             |
| 2xl  | 24px  | 32px        | Page headings              |
| 3xl  | 30px  | 36px        | Large headings             |
| 4xl  | 36px  | 40px        | Hero text                  |
| 5xl  | 48px  | 48px        | Display text               |

### Usage Example

```tsx
import { typography } from '@/constants/typography';

// Using typography presets
<Text style={typography.h1}>Heading</Text>
<Text style={typography.bodyLarge}>Body text</Text>

// Using Tailwind classes
<Text className="text-2xl font-bold text-text">Heading</Text>
<Text className="text-base font-regular text-text-secondary">Body</Text>
```

---

## Spacing Scale

Consistent spacing throughout the app:

| Name | Value | Usage                      |
| ---- | ----- | -------------------------- |
| xs   | 4px   | Tight spacing, icon gaps   |
| sm   | 8px   | Small gaps, button padding |
| md   | 16px  | Standard spacing, margins  |
| lg   | 24px  | Section spacing            |
| xl   | 32px  | Large section gaps         |
| 2xl  | 48px  | Page padding               |
| 3xl  | 64px  | Major sections             |
| 4xl  | 96px  | Extra large spacing        |

```tsx
className = "p-4"; // 16px padding
className = "mb-6"; // 24px margin bottom
className = "gap-2"; // 8px gap
```

---

## Border Radius

| Name    | Value  | Usage                    |
| ------- | ------ | ------------------------ |
| sm      | 4px    | Small elements, badges   |
| DEFAULT | 8px    | Standard buttons, inputs |
| md      | 12px   | Cards, containers        |
| lg      | 16px   | Large cards              |
| xl      | 20px   | Prominent elements       |
| 2xl     | 24px   | Hero sections            |
| 3xl     | 32px   | Large containers         |
| full    | 9999px | Circular elements        |

```tsx
className = "rounded-lg"; // 16px
className = "rounded-full"; // circular
```

---

## Shadows

Native React Native shadow styles:

```tsx
import { Shadows } from "@/constants/colors";

// Usage
<View style={Shadows.md}>...</View>;
```

| Name | Elevation | Usage             |
| ---- | --------- | ----------------- |
| sm   | 1         | Subtle elevation  |
| md   | 3         | Cards, buttons    |
| lg   | 5         | Modals, dropdowns |
| xl   | 8         | Floating elements |

---

## Component Examples

### Button

```tsx
// Primary button
<Button className="bg-primary text-white">
  Submit
</Button>

// Outline button
<Button variant="outline" className="border-primary text-primary">
  Cancel
</Button>
```

### Input Field

```tsx
<Input
  label="Email"
  placeholder="Enter your email"
  className="bg-interactive"
/>
```

### Card

```tsx
<Card className="bg-white rounded-lg p-4 shadow-md">
  <Text className="text-text font-semibold">Card Title</Text>
</Card>
```

---

## Design Tokens Quick Reference

```typescript
// Import design tokens
import { Colors, Spacing, BorderRadius, FontSizes } from '@/constants/colors';
import { typography } from '@/constants/typography';

// Usage
backgroundColor: Colors.primary.DEFAULT,
padding: Spacing.md,
borderRadius: BorderRadius.lg,
fontSize: FontSizes.xl,
...typography.h1
```

---

## Accessibility

- **Minimum touch target**: 44x44px
- **Text contrast**: All text meets WCAG AA standards
- **Focus indicators**: Clear focus states on interactive elements
- **Font scaling**: Supports system font size preferences

---

## Dark Mode (Future)

Colors are prepared for future dark mode support with light/dark variants. Current implementation uses light mode only.

---

## Figma Source

Design files located in: `/figma-desgin/`

All component designs, screens, and specifications are documented in the Figma files for reference.
