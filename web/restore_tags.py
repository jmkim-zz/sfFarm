with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

bad_snippet = """              <span className="text-xl">+</span> Add Equipment


        {/* Facilities Setting Tab */}"""

good_snippet = """              <span className="text-xl">+</span> Add Equipment
            </button>
          </div>
        </div>
      )}

        {/* Facilities Setting Tab */}"""

if bad_snippet in c:
    c = c.replace(bad_snippet, good_snippet)
    with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
        f.write(c)
    print('Restored missing tags.')
else:
    print('Could not find the target string.')
