with open('src/components/settings/FacilitiesSettings.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Add to props
c = c.replace(
    "export default function FacilitiesSettings({ showNotification }: any) {",
    "export default function FacilitiesSettings({ showNotification, onFacilitiesChange }: any) {"
)

# Call inside handleSave
c = c.replace(
    "      showNotification('Facility saved successfully.', 'success');\n      setIsEditing(null);\n      setEditForm(null);\n      fetchFacilities();",
    "      showNotification('Facility saved successfully.', 'success');\n      setIsEditing(null);\n      setEditForm(null);\n      fetchFacilities();\n      if (onFacilitiesChange) onFacilitiesChange();"
)

# Call inside handleDelete
c = c.replace(
    "        showNotification('Facility deleted.', 'success');\n        fetchFacilities();",
    "        showNotification('Facility deleted.', 'success');\n        fetchFacilities();\n        if (onFacilitiesChange) onFacilitiesChange();"
)

with open('src/components/settings/FacilitiesSettings.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated FacilitiesSettings')
