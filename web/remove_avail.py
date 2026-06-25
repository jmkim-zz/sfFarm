import re
with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Remove the div with md:grid-cols-2 gap-8 which contains Sensor Availability and Equipment Availability
# Also remove the <hr className="border-0 border-t border-gray-200 my-10" />

start_tag = '<div className="grid md:grid-cols-2 gap-8">'
end_tag = '<hr className="border-0 border-t border-gray-200 my-10" />\n'

s_idx = c.find(start_tag)
e_idx = c.find(end_tag)

if s_idx != -1 and e_idx != -1:
    c = c[:s_idx] + c[e_idx + len(end_tag):]
    print('Removed Availability Sections')
else:
    print('Tags not found')

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
