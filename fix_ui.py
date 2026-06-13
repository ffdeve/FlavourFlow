with open('src/app/recipe-detail.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '{ing.quantity} {ing.name}',
    '{ing.amount ? `${ing.amount} ${ing.unit || ""}` : ing.quantity} {ing.name}'
)

with open('src/app/recipe-detail.tsx', 'w') as f:
    f.write(content)
