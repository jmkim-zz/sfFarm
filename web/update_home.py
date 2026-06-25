with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

banner_html = '''
            {/* Quick Setup Banner */}
            <div className="bg-gradient-to-r from-secondary/10 to-primary/5 rounded-2xl p-6 border border-secondary/20 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <Tractor size={20} className="text-secondary" />
                  Facility Configuration Required
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  시스템을 사용하기 전에 가장 먼저 시설(온실/베드)을 등록하고 센서 및 장비를 설정해주세요.
                </p>
              </div>
              <button
                onClick={() => router.push('?tab=facilities')}
                className="whitespace-nowrap px-6 py-3 bg-secondary hover:bg-secondary-dark text-white rounded-xl font-semibold shadow-md transition-all flex items-center gap-2"
              >
                Go to Facilities Settings <ChevronRight size={18} />
              </button>
            </div>
'''

welcome_end = '            {/* Weather Card */}'

c = c.replace(welcome_end, banner_html + '\n' + welcome_end)

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Added Quick Setup Banner to Home Tab')
