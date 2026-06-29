export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  recurrence?: string[];
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
}

const API_BASE = 'https://www.googleapis.com/calendar/v3';

// 캘린더 목록 가져오기
export async function getCalendars(token: string) {
  const res = await fetch(`${API_BASE}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch calendars: ${res.status} ${errText}`);
  }
  return res.json();
}

// 새 캘린더 생성
export async function createCalendar(token: string, summary: string) {
  const res = await fetch(`${API_BASE}/calendars`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ summary }),
  });
  if (!res.ok) throw new Error('Failed to create calendar');
  return res.json();
}

// 이름으로 캘린더 찾기, 없으면 생성
export async function checkAndCreateCalendar(token: string, calendarName: string) {
  const data = await getCalendars(token);
  const existing = data.items?.find((c: any) => c.summary === calendarName);
  
  if (existing) {
    return existing.id;
  }
  
  const newCalendar = await createCalendar(token, calendarName);
  return newCalendar.id;
}

// 특정 캘린더의 일정 가져오기
export async function getEvents(token: string, calendarId: string, timeMin: string, timeMax?: string) {
  const url = new URL(`${API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.append('singleEvents', 'true');
  url.searchParams.append('orderBy', 'startTime');
  url.searchParams.append('maxResults', '10');
  if (timeMin) {
    url.searchParams.append('timeMin', timeMin);
  }
  if (timeMax) {
    url.searchParams.append('timeMax', timeMax);
  }
  
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

// 특정 캘린더에 일정 추가하기
export async function addEvent(token: string, calendarId: string, event: CalendarEvent) {
  const res = await fetch(`${API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to add event: ${res.status} ${errText}`);
  }
  return res.json();
}

// 특정 캘린더의 일정 삭제하기
export async function deleteEvent(token: string, calendarId: string, eventId: string) {
  const res = await fetch(`${API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to delete event: ${res.status} ${errText}`);
  }
  return true;
}

// 특정 캘린더의 모든 일정 삭제하기 (Clear All)
export async function deleteAllEvents(token: string, calendarId: string) {
  // singleEvents=false 로 부모 일정 목록을 모두 불러옴
  const url = new URL(`${API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch events for deletion');
  const data = await res.json();
  const events = data.items || [];

  // 부모 일정을 순회하며 삭제 (한 번에 5개씩 병렬 처리하여 Rate Limit 방지)
  for (let i = 0; i < events.length; i += 5) {
    const batch = events.slice(i, i + 5);
    await Promise.all(batch.map((e: any) => deleteEvent(token, calendarId, e.id)));
  }
  return true;
}
