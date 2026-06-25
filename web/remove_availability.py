with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# The system settings tab has the Availability grids.
# I will find the block to remove.
start_str = '            <div className="grid md:grid-cols-2 gap-8">'
end_str = '            <hr className="border-0 border-t border-gray-200 my-10" />'

s_idx = c.find(start_str)
e_idx = c.find(end_str)

if s_idx != -1 and e_idx != -1:
    c = c[:s_idx] + c[e_idx + len(end_str):]
    print('Removed Availability sections from System Settings')
else:
    print('Could not find sections')

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
