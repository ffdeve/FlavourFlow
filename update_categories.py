import re
import os

def update_file(filename):
    if not os.path.exists(filename):
        return

    with open(filename, 'r') as f:
        content = f.read()

    # Remove dummy-data import
    content = re.sub(r'import\s*\{\s*categories.*?\s*\}\s*from\s*["\']@/lib/dummy-data["\'];?\n?', '', content)
    
    # Check if recipeService is imported, if not, add it
    if 'recipeService' not in content:
        content = content.replace(
            'import { router',
            'import { recipeService } from "@/services/recipe.service";\nimport { router'
        )

    # For search.tsx and category-details.tsx, they might just render `categories` directly.
    # We need to add state and useEffect.
    # Let's find the component definition
    component_match = re.search(r'export default function (\w+)\(\)\s*\{', content)
    if component_match:
        comp_name = component_match.group(1)
        state_code = """  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    recipeService.getCategories().then(setCategories).catch(console.error);
  }, []);
"""
        # Insert state right after component declaration
        content = content.replace(
            f'export default function {comp_name}() {{',
            f'export default function {comp_name}() {{\n{state_code}'
        )

    with open(filename, 'w') as f:
        f.write(content)

update_file('src/app/search.tsx')
update_file('src/app/category-details.tsx')
