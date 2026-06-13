import re

# 1. Fix index.tsx dummy data import and PromotionCarousel prop
with open('src/app/(tabs)/index.tsx', 'r') as f:
    idx_content = f.read()

idx_content = re.sub(r'import\s*\{.*?\}\s*from\s*["\']@/lib/dummy-data["\'];?\n?', '', idx_content)
idx_content = idx_content.replace(
    '<PromotionCarousel onIndexChange={setActivePromoIndex} />',
    '<PromotionCarousel recipes={featuredRecipes} onIndexChange={setActivePromoIndex} />'
)
# Fix dynamic color mapping which used dummy data
idx_content = idx_content.replace(
    'const activeColor = featuredRecipes[activePromoIndex]?.backgroundColor || "#FBA82E";',
    'const activeColor = (featuredRecipes[activePromoIndex] as any)?.backgroundColor || "#FBA82E";'
)

with open('src/app/(tabs)/index.tsx', 'w') as f:
    f.write(idx_content)

# 2. Fix category-details.tsx `categories` reference
with open('src/app/category-details.tsx', 'r') as f:
    cat_content = f.read()

cat_content = cat_content.replace(
    'const category = categories.find((c) => c.id === id);',
    'const category = categories.find((c) => c.id === id) || { id, name: id };'
)

with open('src/app/category-details.tsx', 'w') as f:
    f.write(cat_content)

