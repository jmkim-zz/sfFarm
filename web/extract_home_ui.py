with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

start_tag = '              {/* System connections card */}'
start_idx = c.find(start_tag)
if start_idx != -1:
    end_tag = '        {/* Dashboard Tab */}'
    end_idx = c.find(end_tag, start_idx)
    section = c[start_idx:end_idx]
    
    with open('extracted_section.tsx', 'w', encoding='utf-8') as out:
        out.write(section)
    print('Extracted successfully')
else:
    print('Not found')
