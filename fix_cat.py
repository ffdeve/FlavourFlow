with open('src/app/category-details.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'const ALL_CATEGORIES = [{ id: "all", name: "All" }, ...categories];',
    ''
)

# Replace usage of ALL_CATEGORIES inside the component
content = content.replace(
    'ALL_CATEGORIES',
    '[{ id: "all", name: "All" }, ...categories]'
)

with open('src/app/category-details.tsx', 'w') as f:
    f.write(content)
