import re

with open('DashboardClient_orig.tsx', 'r', encoding='utf-8') as f:
    orig = f.read()

# The block that was deleted
match = re.search(r'(<div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center \$\{selectedArduinoBoard === \'Arduino UNO R3\' \? \'border-secondary\' : \'border-gray-300\'}`}>\s*\{selectedArduinoBoard === \'Arduino UNO R3\' && <div className="w-2\.5 h-2\.5 rounded-full bg-secondary"></div>\}\s*</div>\s*<span className="font-bold text-lg text-gray-800">Arduino UNO R3</span>\s*</div>\s*<CircuitBoard className={`w-8 h-8 \$\{selectedArduinoBoard === \'Arduino UNO R3\' \? \'text-secondary\' : \'text-gray-400\'}`\} />\s*</div>\s*<p className="text-gray-600 text-sm pl-8">Standard Arduino board without built-in WiFi\. Requires external modules for network connectivity\.</p>\s*</label>\s*\{\/\* Arduino UNO R4 WiFi \*\/\}\s*<label className={`relative flex flex-col p-6 cursor-pointer rounded-xl border-2 transition-all duration-300 \$\{selectedArduinoBoard === \'Arduino UNO R4 WiFi\' \? \'border-secondary bg-secondary/5\' : \'border-gray-200 hover:border-gray-300 hover:bg-gray-50\'}`\}>\s*<input type="radio" name="arduino_board" value="Arduino UNO R4 WiFi" className="absolute opacity-0" checked=\{selectedArduinoBoard === \'Arduino UNO R4 WiFi\'\} onChange=\{\(e\) => setSelectedArduinoBoard\(e\.target\.value\)\} />\s*<div className="flex justify-between items-center mb-4">\s*<div className="flex items-center gap-3">\s*<div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center \$\{selectedArduinoBoard === \'Arduino UNO R4 WiFi\' \? \'border-secondary\' : \'border-gray-300\'}`\}>\s*\{selectedArduinoBoard === \'Arduino UNO R4 WiFi\' && <div className="w-2\.5 h-2\.5 rounded-full bg-secondary"></div>\})', orig, re.DOTALL)

if match:
    deleted_block = match.group(1)
    
    with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
        curr = f.read()
    
    # In the current file, this was collapsed into empty space.
    curr_target = r'<div className="flex items-center gap-3">\s*</div>\s*<span className="font-bold text-lg text-gray-800">Arduino UNO R4 WiFi</span>'
    curr_match = re.search(curr_target, curr)
    
    if curr_match:
        replacement = deleted_block + '\n                    </div>\n                    <span className="font-bold text-lg text-gray-800">Arduino UNO R4 WiFi</span>'
        new_curr = curr[:curr_match.start()] + replacement + curr[curr_match.end():]
        with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
            f.write(new_curr)
        print("Restored successfully.")
    else:
        print("Could not find insertion point in curr.")
else:
    print("Could not find original block.")
