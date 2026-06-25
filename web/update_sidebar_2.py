with open('src/components/layout/Sidebar.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Remove Current Facility Dropdown
start_str = '{/* Header / Facility Selector */}'
end_str = '{/* Navigation Links */}'

s_idx = c.find(start_str)
e_idx = c.find(end_str)

if s_idx != -1 and e_idx != -1:
    c = c[:s_idx] + c[e_idx:]

with open('src/components/layout/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Sidebar dropdown removed successfully')
