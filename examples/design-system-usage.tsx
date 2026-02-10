// Example: How to use the FlavourFlow Design System

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Colors, Spacing } from "@/constants/colors";
import { typography } from "@/constants/typography";
import React from "react";
import { Text, View } from "react-native";

export function DesignSystemExample() {
  return (
    <View className="flex-1 bg-background p-6">
      {/* Using Tailwind Classes (Recommended) */}
      <Text className="text-3xl font-bold text-text mb-4">FlavourFlow</Text>

      <Text className="text-base text-text-secondary mb-6">
        Pakistani recipes at your fingertips
      </Text>

      {/* Buttons */}
      <Button variant="primary" className="mb-3">
        Primary Button
      </Button>

      <Button variant="outline" className="mb-3">
        Outline Button
      </Button>

      {/* Input Fields */}
      <Input
        label="Email"
        placeholder="Enter your email"
        containerClassName="mb-4"
      />

      {/* Cards */}
      <Card className="mb-4">
        <Text className="text-lg font-semibold text-text mb-2">
          Recipe Card
        </Text>
        <Text className="text-sm text-text-secondary">
          Delicious Pakistani biryani recipe
        </Text>
      </Card>

      {/* Using Direct Style Objects (when Tailwind isn't enough) */}
      <View
        style={{
          backgroundColor: Colors.primary.DEFAULT,
          padding: Spacing.md,
          borderRadius: 12,
        }}
      >
        <Text style={typography.h2}>Styled with Design Tokens</Text>
      </View>

      {/* Semantic Colors */}
      <View className="mt-6 space-y-2">
        <View className="bg-success p-3 rounded">
          <Text className="text-white">Success Message</Text>
        </View>

        <View className="bg-error p-3 rounded">
          <Text className="text-white">Error Message</Text>
        </View>

        <View className="bg-warning p-3 rounded">
          <Text className="text-white">Warning Message</Text>
        </View>
      </View>

      {/* Interactive States */}
      <View className="mt-6">
        <Text className="text-text font-medium mb-2">Interactive Element</Text>
        <View className="bg-interactive p-4 rounded-lg active:bg-interactive-dark">
          <Text className="text-text">Tap me!</Text>
        </View>
      </View>
    </View>
  );
}

// COLOR REFERENCE
// ================

// Primary (Golden Yellow)
// - bg-primary, text-primary, border-primary
// - #FBA82E

// Background (Cream)
// - bg-background
// - #FCF0D6

// Interactive (Darker Cream) - for inputs, etc.
// - bg-interactive
// - #EDD8A9

// Text (Dark Brown)
// - text-text (primary)
// - text-text-secondary
// - text-text-tertiary
// - #3B3328, #6B5D4F, #8B7D6F

// Semantic
// - bg-success, text-success (#4CAF50)
// - bg-error, text-error (#EF4444)
// - bg-warning, text-warning (#F59E0B)
// - bg-info, text-info (#3B82F6)

// TYPOGRAPHY REFERENCE
// ====================

// Font Weights (Poppins)
// - font-light (300)
// - font-regular (400)
// - font-medium (500)
// - font-semibold (600)
// - font-bold (700)

// Font Sizes
// - text-xs (12px)
// - text-sm (14px)
// - text-base (16px)
// - text-lg (18px)
// - text-xl (20px)
// - text-2xl (24px)
// - text-3xl (30px)
// - text-4xl (36px)
// - text-5xl (48px)

// SPACING REFERENCE
// =================

// - p-1 (4px), p-2 (8px), p-4 (16px), p-6 (24px), p-8 (32px)
// - m-1, m-2, m-4, m-6, m-8 (same values)
// - gap-1, gap-2, gap-4, gap-6 (same values)

// BORDER RADIUS
// =============

// - rounded-sm (4px)
// - rounded (8px)
// - rounded-md (12px)
// - rounded-lg (16px)
// - rounded-xl (20px)
// - rounded-2xl (24px)
// - rounded-full (circular)
