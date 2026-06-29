import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Loader2, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { checkAndCreateCalendar, getEvents, addEvent, deleteEvent, deleteAllEvents, CalendarEvent } from '../../lib/calendar/googleCalendar';

export default function MaintenanceSchedule() {
  const [token, setToken] = useState<string | null>(null);
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [calendarName, setCalendarName] = useState('SmartFarm Maintenance');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // New Event States
  const [facilities, setFacilities] = useState<any[]>([]);
  const [newEventFacility, setNewEventFacility] = useState('All');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventReminderValue, setNewEventReminderValue] = useState('1');
  const [newEventReminderUnit, setNewEventReminderUnit] = useState('none');
  const [newEventRepeatValue, setNewEventRepeatValue] = useState('1');
  const [newEventRepeatUnit, setNewEventRepeatUnit] = useState('none');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  useEffect(() => {
    const fetchFacilities = async () => {
      const { data, error } = await supabase.from('device_configs').select('device_id, description').order('device_id', { ascending: true });
      if (error) console.error("Failed to fetch facilities:", error);
      if (data) setFacilities(data);
    };
    fetchFacilities();
    checkAuthAndCalendar();
  }, []);

  const checkAuthAndCalendar = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError("User is not authenticated.");
        setIsLoading(false);
        return;
      }
      
      // 구글 프로바이더 토큰 확인
      const providerToken = session.provider_token;
      if (!providerToken) {
        setError("Google Calendar access token is missing. Please re-login with Google.");
        setIsLoading(false);
        return;
      }
      
      setToken(providerToken);

      // 사용자 메타데이터 확인
      const metaCalendarId = session.user.user_metadata?.calendar_id;
      if (metaCalendarId) {
        setCalendarId(metaCalendarId);
        await fetchEvents(providerToken, metaCalendarId);
      } else {
        setShowOnboarding(true);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to initialize Google Calendar integration.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCalendar = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      // 캘린더 생성 및 ID 반환
      const newId = await checkAndCreateCalendar(token, calendarName);
      
      // Supabase user_metadata 업데이트
      const { error: updateError } = await supabase.auth.updateUser({
        data: { calendar_id: newId }
      });
      
      if (updateError) throw updateError;
      
      setCalendarId(newId);
      setShowOnboarding(false);
      await fetchEvents(token, newId);
    } catch (err: any) {
      console.error(err);
      setError("Failed to create Google Calendar: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async (authToken: string, calId: string) => {
    try {
      const timeMin = new Date().toISOString(); // 현재 시간 이후 일정
      const data = await getEvents(authToken, calId, timeMin);
      setEvents(data.items || []);
    } catch (err: any) {
      console.error(err);
      if (err.message.includes("fetch events")) {
        setError("Token might be expired. Please re-login with Google to refresh access.");
      }
    }
  };

  const handleAddEvent = async () => {
    if (!token || !calendarId || !newEventTitle || !newEventDate) return;
    
    setIsLoading(true);
    try {
      let overrides: Array<{method: string, minutes: number}> | undefined = undefined;
      if (newEventReminderUnit !== 'none') {
        let minutes = parseInt(newEventReminderValue, 10) || 1;
        if (newEventReminderUnit === 'hours') minutes *= 60;
        else if (newEventReminderUnit === 'days') minutes *= 1440;
        
        overrides = [
          { method: 'email', minutes },
          { method: 'popup', minutes }
        ];
      }

      let recurrence: string[] | undefined = undefined;
      if (newEventRepeatUnit !== 'none') {
        const count = parseInt(newEventRepeatValue, 10) || 1;
        recurrence = [`RRULE:FREQ=${newEventRepeatUnit};COUNT=${count}`];
      }

      let finalTitle = newEventTitle;
      if (newEventFacility === 'All') {
        finalTitle = `[All] ${newEventTitle}`;
      } else {
        const fac = facilities.find(f => f.device_id === newEventFacility);
        const facName = fac?.description || fac?.device_id || 'Unknown';
        finalTitle = `[${facName}] ${newEventTitle}`;
      }

      const newEvent: CalendarEvent = {
        summary: finalTitle,
        description: newEventDesc,
        start: { date: newEventDate },
        end: { date: newEventDate }, // 종일 일정 기준
        ...(recurrence && { recurrence }),
        ...(overrides && { reminders: { useDefault: false, overrides } }),
      };
      
      await addEvent(token, calendarId, newEvent);
      setShowAddModal(false);
      setNewEventFacility('All');
      setNewEventTitle('');
      setNewEventDesc('');
      setNewEventDate('');
      setNewEventReminderValue('1');
      setNewEventReminderUnit('none');
      setNewEventRepeatValue('1');
      setNewEventRepeatUnit('none');
      
      // 일정 목록 다시 불러오기
      await fetchEvents(token, calendarId);
    } catch (err: any) {
      console.error(err);
      setError("Failed to add event.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/spreadsheets',
        queryParams: {
          prompt: 'consent',
        }
      }
    });
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!token || !calendarId) return;
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    setIsLoading(true);
    try {
      await deleteEvent(token, calendarId, eventId);
      await fetchEvents(token, calendarId);
      setSelectedEvents(prev => prev.filter(id => id !== eventId));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to delete event.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!token || !calendarId || selectedEvents.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedEvents.length} events?`)) return;

    setIsLoading(true);
    try {
      await Promise.all(selectedEvents.map(eventId => deleteEvent(token, calendarId, eventId)));
      await fetchEvents(token, calendarId);
      setSelectedEvents([]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to delete events.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectEvent = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  };

  const handleSelectAll = () => {
    const allIds = events.filter(e => e.id).map(e => e.id as string);
    if (selectedEvents.length === allIds.length && allIds.length > 0) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(allIds);
    }
  };

  const handleClearAll = async () => {
    if (!token || !calendarId) return;
    const confirmMessage = "경고: 선택하신 스마트팜 캘린더의 '모든' 일정이 영구적으로 삭제됩니다. 보이지 않는 수백 개의 반복 일정을 포함해 캘린더가 완전히 비워집니다.\n\n정말 진행하시겠습니까?";
    if (!confirm(confirmMessage)) return;

    setIsLoading(true);
    try {
      await deleteAllEvents(token, calendarId);
      await fetchEvents(token, calendarId);
      setSelectedEvents([]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to clear all events.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !showOnboarding) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-secondary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-primary">Maintenance Schedule</h2>
          <p className="text-sm text-gray-500 mt-1">Manage farm maintenance tasks via Google Calendar</p>
        </div>
        {calendarId && (
          <div className="flex gap-3">
            <button 
              onClick={handleClearAll}
              className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              title="Delete all events from this calendar"
            >
              <Trash2 size={16} /> Clear All Events
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-secondary hover:bg-secondary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} /> New Event
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-3 mb-6">
          <AlertCircle size={20} className="mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-sm">{error}</p>
            {error.includes('re-login') && (
              <button 
                onClick={handleReLogin}
                className="mt-2 flex items-center gap-2 bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded text-sm hover:bg-red-50 transition-colors"
              >
                <RefreshCw size={14} /> Re-connect Google Account
              </button>
            )}
          </div>
        </div>
      )}

      {showOnboarding ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100 max-w-lg mx-auto mt-10">
          <div className="w-16 h-16 bg-blue-50 text-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarIcon size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Setup Smart Farm Calendar</h3>
          <p className="text-sm text-gray-500 mb-6">
            We will create a dedicated Google Calendar for your farm maintenance tasks to keep them separate from your personal events.
          </p>
          <div className="text-left mb-6">
            <label className="block text-xs font-medium text-gray-700 mb-1">Calendar Name</label>
            <input 
              type="text" 
              value={calendarName}
              onChange={(e) => setCalendarName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:border-secondary outline-none text-sm"
            />
          </div>
          <button 
            onClick={handleCreateCalendar}
            disabled={isLoading || !calendarName.trim()}
            className="w-full bg-secondary hover:bg-secondary/90 disabled:bg-gray-300 text-white py-2 rounded-lg font-medium transition-colors flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Create and Connect'}
          </button>
        </div>
      ) : calendarId ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 p-4 bg-gray-50 flex justify-between items-center">
            <h3 className="font-medium text-gray-700 flex items-center gap-2">
              <CalendarIcon size={18} className="text-secondary"/> Upcoming Events
              {events.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-gray-500 ml-4 cursor-pointer font-normal">
                  <input 
                    type="checkbox" 
                    checked={events.length > 0 && selectedEvents.length === events.filter(e => e.id).length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-secondary focus:ring-secondary w-4 h-4 cursor-pointer"
                  />
                  Select All
                </label>
              )}
            </h3>
            <div className="flex items-center gap-3">
              {selectedEvents.length > 0 && (
                <button 
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border border-red-200"
                  title="Delete Selected"
                >
                  <Trash2 size={16} /> Delete Selected ({selectedEvents.length})
                </button>
              )}
              <button onClick={() => checkAuthAndCalendar()} className="text-gray-400 hover:text-secondary p-1.5 rounded-md hover:bg-gray-200 transition-colors" title="Refresh">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {events.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No upcoming maintenance events found.
              </div>
            ) : (
              events.map((event, idx) => {
                const dateStr = event.start.dateTime || event.start.date;
                let formattedDate = 'Unknown Date';
                if (dateStr) {
                  const d = new Date(dateStr);
                  formattedDate = `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`;
                  if (event.start.dateTime) {
                    formattedDate += ` ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                  }
                }
                
                return (
                  <div key={event.id || idx} className={`p-3 md:p-4 flex items-start gap-2 md:gap-4 transition-colors ${event.id && selectedEvents.includes(event.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                    {event.id && (
                      <input 
                        type="checkbox" 
                        checked={selectedEvents.includes(event.id)}
                        onChange={() => toggleSelectEvent(event.id!)}
                        className="rounded border-gray-300 text-secondary focus:ring-secondary w-4 h-4 md:w-5 md:h-5 cursor-pointer flex-shrink-0 mt-1 md:mt-0"
                      />
                    )}
                    <div className="bg-blue-50 text-secondary px-2 py-1.5 md:px-4 md:py-3 text-center rounded-lg flex-shrink-0 min-w-[70px] md:min-w-[140px]">
                      <div className="text-xs md:text-sm font-bold whitespace-nowrap">{formattedDate}</div>
                    </div>
                    
                    {/* Clickable Content Area for Expansion */}
                    <div 
                      className="flex-1 min-w-0 cursor-pointer group"
                      onClick={() => {
                        if (event.id) {
                          setExpandedEventId(expandedEventId === event.id ? null : event.id);
                        }
                      }}
                      title="Click to see full details"
                    >
                      <h4 className={`font-semibold text-sm md:text-base text-gray-800 transition-all duration-200 ${expandedEventId === event.id ? 'whitespace-normal' : 'truncate group-hover:text-secondary'}`}>
                        {event.summary || '(No title)'}
                      </h4>
                      {event.description && (
                        <p className={`text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1 transition-all duration-200 ${expandedEventId === event.id ? 'whitespace-pre-wrap' : 'line-clamp-1 md:line-clamp-2'}`}>
                          {event.description}
                        </p>
                      )}
                    </div>

                    {event.id && (
                      <button 
                        onClick={() => handleDeleteEvent(event.id!)}
                        className="p-1.5 md:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        title="Delete Event"
                      >
                        <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {/* Calendar Iframe Embed */}
      {calendarId && !showOnboarding && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-4">
          <h3 className="font-medium text-gray-700 flex items-center gap-2 mb-4">
            <CalendarIcon size={18} className="text-secondary"/> Monthly Overview
          </h3>
          <div className="w-full h-[600px] rounded border border-gray-200 overflow-hidden">
            <iframe 
              src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=Asia/Seoul&mode=MONTH&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0`}
              style={{ border: 0 }} 
              width="100%" 
              height="100%" 
              frameBorder="0" 
              scrolling="no"
            ></iframe>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            * If the calendar says "You do not have permission", please ensure you are logged into your connected Google Account in this browser.
          </p>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Add Maintenance Event</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Facility</label>
                <select 
                  value={newEventFacility} onChange={(e) => setNewEventFacility(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:border-secondary outline-none text-sm"
                >
                  <option value="All">All Facilities</option>
                  {facilities.map(f => (
                    <option key={f.device_id} value={f.device_id}>{f.description || f.device_id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Clean nutrient tank"
                  value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:border-secondary outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                <input 
                  type="date" 
                  value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:border-secondary outline-none text-sm"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Reminder</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" min="1"
                      value={newEventReminderValue} onChange={(e) => setNewEventReminderValue(e.target.value)}
                      disabled={newEventReminderUnit === 'none'}
                      className="w-1/3 p-2 border border-gray-300 rounded focus:border-secondary outline-none text-sm disabled:bg-gray-100"
                    />
                    <select 
                      value={newEventReminderUnit} onChange={(e) => setNewEventReminderUnit(e.target.value)}
                      className="w-2/3 p-2 border border-gray-300 rounded focus:border-secondary outline-none text-sm"
                    >
                      <option value="none">None</option>
                      <option value="hours">Hours before</option>
                      <option value="days">Days before</option>
                    </select>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Repeat</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" min="1" max="100"
                      value={newEventRepeatValue} onChange={(e) => setNewEventRepeatValue(e.target.value)}
                      disabled={newEventRepeatUnit === 'none'}
                      className="w-1/3 p-2 border border-gray-300 rounded focus:border-secondary outline-none text-sm disabled:bg-gray-100"
                      title="Repeat count"
                    />
                    <select 
                      value={newEventRepeatUnit} onChange={(e) => setNewEventRepeatUnit(e.target.value)}
                      className="w-2/3 p-2 border border-gray-300 rounded focus:border-secondary outline-none text-sm"
                    >
                      <option value="none">None</option>
                      <option value="HOURLY">Hourly</option>
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea 
                  rows={3}
                  value={newEventDesc} onChange={(e) => setNewEventDesc(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:border-secondary outline-none text-sm resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">Cancel</button>
              <button 
                onClick={handleAddEvent}
                disabled={isLoading || !newEventTitle || !newEventDate}
                className="bg-secondary hover:bg-secondary/90 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {isLoading && <Loader2 size={14} className="animate-spin" />}
                Save Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
