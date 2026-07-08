import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  Save,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { type AccentColor } from "./timetable";

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  note?: string;
  source: "local" | "google";
  calendarId?: string;
  calendarName?: string;
  color?: string;
};

type EventForm = {
  title: string;
  date: string;
  endDate: string;
  time: string;
  note: string;
};

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
};

type GoogleCalendarInfo = {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
  accessRole?: string;
};

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
const GOOGLE_CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";
const GOOGLE_CALENDAR_LIST_SCOPE =
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly";
const GOOGLE_TOKEN_KEY = "googleCalendarAccessToken";
const GOOGLE_VISIBLE_CALENDARS_KEY = "googleVisibleCalendarIds";

const themeConfig: Record<
  AccentColor,
  {
    primary: string;
    bg: string;
    text: string;
    border: string;
    focus: string;
  }
> = {
  blue: {
    primary: "bg-blue-500",
    bg: "bg-blue-500/15",
    text: "text-blue-300",
    border: "border-blue-500/30",
    focus: "focus:border-blue-500",
  },
  green: {
    primary: "bg-emerald-500",
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
    focus: "focus:border-emerald-500",
  },
  purple: {
    primary: "bg-violet-500",
    bg: "bg-violet-500/15",
    text: "text-violet-300",
    border: "border-violet-500/30",
    focus: "focus:border-violet-500",
  },
  orange: {
    primary: "bg-amber-500",
    bg: "bg-amber-500/15",
    text: "text-amber-300",
    border: "border-amber-500/30",
    focus: "focus:border-amber-500",
  },
  pink: {
    primary: "bg-rose-500",
    bg: "bg-rose-500/15",
    text: "text-rose-300",
    border: "border-rose-500/30",
    focus: "focus:border-rose-500",
  },
  red: {
    primary: "bg-red-500",
    bg: "bg-red-500/15",
    text: "text-red-300",
    border: "border-red-500/30",
    focus: "focus:border-red-500",
  },
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const sameMonth = (date: Date, monthDate: Date) =>
  date.getFullYear() === monthDate.getFullYear() &&
  date.getMonth() === monthDate.getMonth();

const getMonthCells = (monthDate: Date) => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
};

const formatSelectedDate = (dateKey: string) =>
  fromDateKey(dateKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

const formatEventDateRange = (event: CalendarEvent) => {
  if (!event.endDate || event.endDate === event.date) {
    return formatSelectedDate(event.date);
  }

  return `${formatSelectedDate(event.date)} - ${formatSelectedDate(event.endDate)}`;
};

const getDateRangeKeys = (startKey: string, endKey = startKey) => {
  const keys: string[] = [];
  const start = fromDateKey(startKey);
  const end = fromDateKey(endKey);
  const cursor = new Date(start);
  const last = end < start ? start : end;

  while (cursor <= last) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
};

const getGoogleEventDate = (event: GoogleCalendarEvent) => {
  if (event.start?.date) return event.start.date;
  if (event.start?.dateTime) return toDateKey(new Date(event.start.dateTime));
  return "";
};

const getGoogleEventEndDate = (event: GoogleCalendarEvent) => {
  if (event.end?.date) {
    const exclusiveEnd = fromDateKey(event.end.date);
    exclusiveEnd.setDate(exclusiveEnd.getDate() - 1);
    return toDateKey(exclusiveEnd);
  }
  if (event.end?.dateTime) return toDateKey(new Date(event.end.dateTime));
  return getGoogleEventDate(event);
};

const getGoogleEventTime = (event: GoogleCalendarEvent) => {
  if (!event.start?.dateTime) return "";
  return new Date(event.start.dateTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const getGoogleErrorMessage = async (response: Response) => {
  try {
    const data = (await response.json()) as {
      error?: { message?: string; status?: string };
    };
    return data.error?.message || data.error?.status || response.statusText;
  } catch {
    return response.statusText;
  }
};

const CalendarWidget = ({
  accentColor = "blue",
}: {
  accentColor?: AccentColor;
}) => {
  const theme = themeConfig[accentColor];
  const todayKey = toDateKey(new Date());

  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendarInfo[]>(
    [],
  );
  const [visibleGoogleCalendarIds, setVisibleGoogleCalendarIds] = useState<
    string[]
  >(() => {
    const saved = localStorage.getItem(GOOGLE_VISIBLE_CALENDARS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [targetGoogleCalendarId, setTargetGoogleCalendarId] =
    useState("primary");
  const [googleToken, setGoogleToken] = useState(
    () => sessionStorage.getItem(GOOGLE_TOKEN_KEY) || "",
  );
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [isAdding, setIsAdding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [eventPendingDelete, setEventPendingDelete] =
    useState<CalendarEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToGoogle, setSaveToGoogle] = useState(!!googleToken);
  const [eventForm, setEventForm] = useState<EventForm>({
    title: "",
    date: todayKey,
    endDate: todayKey,
    time: "",
    note: "",
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    const q = query(collection(db, "calendarEvents"), orderBy("date", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setEvents(
        snapshot.docs.map((snapshotDoc) => ({
          source: "local",
          id: snapshotDoc.id,
          ...(snapshotDoc.data() as Omit<CalendarEvent, "id" | "source">),
        })),
      );
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!googleToken) {
      setGoogleEvents([]);
      setGoogleCalendars([]);
      return;
    }

    const fetchCalendars = async () => {
      setIsGoogleLoading(true);
      setGoogleError("");
      try {
        const response = await fetch(
          "https://www.googleapis.com/calendar/v3/users/me/calendarList",
          {
            headers: {
              Authorization: `Bearer ${googleToken}`,
            },
          },
        );

        if (response.status === 401) {
          sessionStorage.removeItem(GOOGLE_TOKEN_KEY);
          setGoogleToken("");
          setGoogleEvents([]);
          setGoogleCalendars([]);
          setGoogleError("Google Calendar access expired.");
          return;
        }

        if (!response.ok) {
          throw new Error(await getGoogleErrorMessage(response));
        }

        const data = (await response.json()) as {
          items?: GoogleCalendarInfo[];
        };
        const calendars = data.items || [];
        setGoogleCalendars(calendars);

        const savedIds = visibleGoogleCalendarIds.filter((id) =>
          calendars.some((calendar) => calendar.id === id),
        );
        const primaryCalendar = calendars.find((calendar) => calendar.primary);
        const defaultIds =
          savedIds.length > 0
            ? savedIds
            : primaryCalendar
              ? [primaryCalendar.id]
              : calendars[0]
                ? [calendars[0].id]
                : [];

        setVisibleGoogleCalendarIds(defaultIds);
        localStorage.setItem(
          GOOGLE_VISIBLE_CALENDARS_KEY,
          JSON.stringify(defaultIds),
        );

        const writableCalendar =
          calendars.find((calendar) =>
            ["owner", "writer"].includes(calendar.accessRole || ""),
          ) || primaryCalendar;
        setTargetGoogleCalendarId(writableCalendar?.id || "primary");
      } catch (error) {
        console.error("Google Calendar list failed:", error);
        setGoogleError("Could not load Google calendars.");
      } finally {
        setIsGoogleLoading(false);
      }
    };

    fetchCalendars();
  }, [googleToken]);

  useEffect(() => {
    if (!googleToken || visibleGoogleCalendarIds.length === 0) {
      setGoogleEvents([]);
      return;
    }

    const gridCells = getMonthCells(monthDate);
    const timeMin = gridCells[0].toISOString();
    const timeMaxDate = new Date(gridCells[gridCells.length - 1]);
    timeMaxDate.setDate(timeMaxDate.getDate() + 1);

    const fetchGoogleEvents = async () => {
      setIsGoogleLoading(true);
      setGoogleError("");
      try {
        const fetchedEvents = await Promise.all(
          visibleGoogleCalendarIds.map(async (calendarId) => {
            const params = new URLSearchParams({
              singleEvents: "true",
              orderBy: "startTime",
              timeMin,
              timeMax: timeMaxDate.toISOString(),
            });
            const response = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
              {
                headers: {
                  Authorization: `Bearer ${googleToken}`,
                },
              },
            );

            if (response.status === 401) {
              sessionStorage.removeItem(GOOGLE_TOKEN_KEY);
              setGoogleToken("");
              setGoogleEvents([]);
              setGoogleError("Google Calendar access expired.");
              return [];
            }

            if (!response.ok) {
              throw new Error(await getGoogleErrorMessage(response));
            }

            const calendar = googleCalendars.find(
              (item) => item.id === calendarId,
            );
            const data = (await response.json()) as {
              items?: GoogleCalendarEvent[];
            };

            return (data.items || [])
              .map((item) => ({
                id: item.id,
                title: item.summary || "Untitled event",
                date: getGoogleEventDate(item),
                endDate: getGoogleEventEndDate(item),
                time: getGoogleEventTime(item),
                note: item.description || "",
                source: "google" as const,
                calendarId,
                calendarName: calendar?.summary,
                color: calendar?.backgroundColor,
              }))
              .filter((item) => item.date);
          }),
        );
        setGoogleEvents(fetchedEvents.flat());
      } catch (error) {
        console.error("Google Calendar sync failed:", error);
        setGoogleError("Google Calendar sync failed.");
      } finally {
        setIsGoogleLoading(false);
      }
    };

    fetchGoogleEvents();
  }, [googleToken, googleCalendars, monthDate, visibleGoogleCalendarIds]);

  const monthCells = useMemo(() => getMonthCells(monthDate), [monthDate]);
  const allEvents = useMemo(
    () => [...events, ...googleEvents],
    [events, googleEvents],
  );

  const eventsByDate = useMemo(() => {
    return allEvents.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
      getDateRangeKeys(event.date, event.endDate).forEach((dateKey) => {
        acc[dateKey] = [...(acc[dateKey] || []), event];
      });
      return acc;
    }, {});
  }, [allEvents]);

  const selectedEvents = (eventsByDate[selectedDate] || []).sort((a, b) =>
    (a.time || "99:99").localeCompare(b.time || "99:99"),
  );

  const changeMonth = (direction: -1 | 1) => {
    setMonthDate(
      (current) => new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  };

  const openAddForm = (dateKey = selectedDate) => {
    setEventForm({
      title: "",
      date: dateKey,
      endDate: dateKey,
      time: "",
      note: "",
    });
    setSaveToGoogle(!!googleToken);
    setIsAdding(true);
  };

  const connectGoogleCalendar = async () => {
    if (!user) return;

    setIsGoogleLoading(true);
    setGoogleError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope(GOOGLE_CALENDAR_SCOPE);
      provider.addScope(GOOGLE_CALENDAR_READONLY_SCOPE);
      provider.addScope(GOOGLE_CALENDAR_LIST_SCOPE);
      provider.setCustomParameters({
        prompt: "consent",
      });
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error("Google did not return an access token.");
      }
      sessionStorage.setItem(GOOGLE_TOKEN_KEY, credential.accessToken);
      setGoogleToken(credential.accessToken);
      setSaveToGoogle(true);
    } catch (error) {
      console.error("Google Calendar connection failed:", error);
      setGoogleError("Could not connect Google Calendar.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const disconnectGoogleCalendar = () => {
    sessionStorage.removeItem(GOOGLE_TOKEN_KEY);
    setGoogleToken("");
    setGoogleEvents([]);
    setGoogleCalendars([]);
    setVisibleGoogleCalendarIds([]);
    localStorage.removeItem(GOOGLE_VISIBLE_CALENDARS_KEY);
    setSaveToGoogle(false);
    setGoogleError("");
  };

  const toggleGoogleCalendarVisibility = (calendarId: string) => {
    setVisibleGoogleCalendarIds((current) => {
      const next = current.includes(calendarId)
        ? current.filter((id) => id !== calendarId)
        : [...current, calendarId];
      localStorage.setItem(GOOGLE_VISIBLE_CALENDARS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const addGoogleEvent = async () => {
    if (!googleToken) return;

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const normalizedEndDate =
      eventForm.endDate && eventForm.endDate >= eventForm.date
        ? eventForm.endDate
        : eventForm.date;
    const requestBody = eventForm.time
      ? {
          summary: eventForm.title.trim(),
          description: eventForm.note.trim(),
          start: {
            dateTime: new Date(
              `${eventForm.date}T${eventForm.time}`,
            ).toISOString(),
            timeZone: timezone,
          },
          end: {
            dateTime: new Date(
              new Date(`${normalizedEndDate}T${eventForm.time}`).getTime() +
                60 * 60 * 1000,
            ).toISOString(),
            timeZone: timezone,
          },
        }
      : {
          summary: eventForm.title.trim(),
          description: eventForm.note.trim(),
          start: { date: eventForm.date },
          end: {
            date: toDateKey(
              new Date(
                fromDateKey(normalizedEndDate).getTime() +
                  24 * 60 * 60 * 1000,
              ),
            ),
          },
        };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetGoogleCalendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      throw new Error(await getGoogleErrorMessage(response));
    }

    const created = (await response.json()) as GoogleCalendarEvent;
    const calendar = googleCalendars.find(
      (item) => item.id === targetGoogleCalendarId,
    );
    setGoogleEvents((current) => [
      ...current,
      {
        id: created.id,
        title: created.summary || eventForm.title.trim(),
        date: getGoogleEventDate(created),
        endDate: getGoogleEventEndDate(created),
        time: getGoogleEventTime(created),
        note: created.description || eventForm.note.trim(),
        source: "google",
        calendarId: targetGoogleCalendarId,
        calendarName: calendar?.summary,
        color: calendar?.backgroundColor,
      },
    ]);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !eventForm.title.trim() || !eventForm.date) return;

    const normalizedEndDate =
      eventForm.endDate && eventForm.endDate >= eventForm.date
        ? eventForm.endDate
        : eventForm.date;

    setIsSaving(true);
    try {
      if (saveToGoogle && googleToken) {
        await addGoogleEvent();
      } else {
        await addDoc(collection(db, "calendarEvents"), {
          title: eventForm.title.trim(),
          date: eventForm.date,
          endDate: normalizedEndDate,
          time: eventForm.time,
          note: eventForm.note.trim(),
          createdAt: serverTimestamp(),
        });
      }
      setSelectedDate(eventForm.date);
      setMonthDate(fromDateKey(eventForm.date));
      setIsAdding(false);
    } catch (error) {
      console.error("Error saving calendar event:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEvent = async (eventItem: CalendarEvent) => {
    if (!user) return;
    if (eventItem.source === "google") {
      if (!googleToken) return;
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(eventItem.calendarId || "primary")}/events/${eventItem.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${googleToken}`,
          },
        },
      );
      if (response.ok) {
        setGoogleEvents((current) =>
          current.filter((event) => event.id !== eventItem.id),
        );
      } else {
        setGoogleError(await getGoogleErrorMessage(response));
      }
    } else {
      await deleteDoc(doc(db, "calendarEvents", eventItem.id));
    }
  };

  const confirmDelete = async () => {
    if (!eventPendingDelete) return;
    await deleteEvent(eventPendingDelete);
    setSelectedEvent((current) =>
      current?.id === eventPendingDelete.id ? null : current,
    );
    setEventPendingDelete(null);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full h-full bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${theme.bg}`}>
              <CalendarDays size={16} className={theme.text} />
            </div>
            <span className={`text-sm font-semibold tracking-wide ${theme.text}`}>
              Calendar
            </span>
          </div>

          {user && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(true)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                title="Calendar settings"
              >
                <Settings size={16} />
              </button>
              <button
                onClick={() => openAddForm()}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                title="Add Event"
              >
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                title="Previous month"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="text-center">
                <h3 className="text-base font-bold text-white">
                  {monthDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <p className="text-[10px] uppercase tracking-widest text-gray-500">
                  {allEvents.length} Events
                </p>
              </div>
              <button
                onClick={() => changeMonth(1)}
                className="p-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                title="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-gray-500 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((date) => {
                const dateKey = toDateKey(date);
                const dayEvents = eventsByDate[dateKey] || [];
                const isSelected = selectedDate === dateKey;
                const isToday = todayKey === dateKey;
                const isCurrentMonth = sameMonth(date, monthDate);

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(dateKey)}
                    onDoubleClick={() => user && openAddForm(dateKey)}
                    className={`relative h-7 rounded-md border text-xs transition-all sm:h-8 ${
                      isSelected
                        ? `${theme.bg} ${theme.border} text-white`
                        : isCurrentMonth
                          ? "border-white/5 bg-white/5 text-gray-200 hover:bg-white/10"
                          : "border-transparent bg-transparent text-gray-600 hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
                        isToday ? `${theme.primary} text-white font-bold` : ""
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    {dayEvents.length > 0 && (
                      <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                        {dayEvents.slice(0, 2).map((event) => (
                          <span
                            key={event.id}
                            className={`h-1 w-1 rounded-full ${
                              event.source === "google"
                                ? "bg-sky-400"
                                : theme.primary
                            }`}
                            style={
                              event.color
                                ? { backgroundColor: event.color }
                                : undefined
                            }
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/5 p-3 min-h-0 flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-white">
                {formatSelectedDate(selectedDate)}
              </h4>
              <p className="text-[10px] uppercase tracking-widest text-gray-500">
                {selectedEvents.length} marked
              </p>
            </div>
            {user && (
              <button
                onClick={() => openAddForm(selectedDate)}
                className={`rounded-lg px-2 py-1 text-xs font-bold text-white ${theme.primary}`}
              >
                Add
              </button>
            )}
          </div>
          {googleError && (
            <p className="mt-1 text-[10px] text-red-300">{googleError}</p>
          )}

          <div className="mt-3 flex-1 min-h-0 space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
            <AnimatePresence mode="popLayout">
              {selectedEvents.length > 0 ? (
                selectedEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    onClick={() => setSelectedEvent(event)}
                    className="group cursor-pointer rounded-lg border border-white/5 bg-black/20 p-3 transition-colors hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                              event.source === "google"
                                ? "bg-sky-400"
                                : theme.primary
                            }`}
                            style={
                              event.color
                                ? { backgroundColor: event.color }
                                : undefined
                            }
                          />
                          <p className="text-sm font-medium text-white truncate">
                            {event.title}
                          </p>
                        </div>
                        {event.time && (
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                            <Clock size={12} />
                            {event.time}
                          </div>
                        )}
                        {event.calendarName && (
                          <p className="mt-1 truncate text-xs text-gray-500">
                            {event.calendarName}
                          </p>
                        )}
                      </div>
                      {user && (
                        <button
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            setEventPendingDelete(event);
                          }}
                          className="p-1.5 rounded-lg text-gray-500 opacity-0 hover:bg-red-500/20 hover:text-red-300 group-hover:opacity-100 transition-all"
                          title="Delete event"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-gray-500 italic">
                  No events marked.
                </div>
              )}
            </AnimatePresence>
          </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {eventPendingDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              onClick={() => setEventPendingDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="relative z-10 w-full max-w-sm bg-gray-900 border border-white/10 p-6 rounded-2xl shadow-2xl backdrop-blur-xl"
            >
              <div className="mb-5">
                <h3 className="text-xl font-bold text-white">Delete event?</h3>
                <p className="mt-2 text-sm text-gray-400">
                  This will remove{" "}
                  <span className="font-semibold text-gray-200">
                    {eventPendingDelete.title}
                  </span>
                  {eventPendingDelete.source === "google"
                    ? " from Google Calendar."
                    : " from your dashboard calendar."}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEventPendingDelete(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-500/80 hover:bg-red-500 text-white rounded-xl font-bold transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedEvent && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              onClick={() => setSelectedEvent(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="relative z-10 w-full max-w-md bg-gray-900 border border-white/10 p-6 rounded-2xl shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                        selectedEvent.source === "google"
                          ? "bg-sky-400"
                          : theme.primary
                      }`}
                      style={
                        selectedEvent.color
                          ? { backgroundColor: selectedEvent.color }
                          : undefined
                      }
                    />
                    <h3 className="text-xl font-bold text-white truncate">
                      {selectedEvent.title}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">
                    {formatEventDateRange(selectedEvent)}
                    {selectedEvent.time ? ` at ${selectedEvent.time}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Source
                  </p>
                  <p className="mt-1 text-sm text-gray-200">
                    {selectedEvent.source === "google"
                      ? selectedEvent.calendarName || "Google Calendar"
                      : "Dashboard calendar"}
                  </p>
                </div>

                {selectedEvent.note && (
                  <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Note
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-200">
                      {selectedEvent.note}
                    </p>
                  </div>
                )}
              </div>

              {user && (
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventPendingDelete(selectedEvent)}
                    className="flex-1 py-3 bg-red-500/80 hover:bg-red-500 text-white rounded-xl font-bold transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="relative z-10 w-full max-w-md bg-gray-900 border border-white/10 p-6 rounded-2xl shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Settings className={theme.text} size={22} />
                  Calendar Settings
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Google Calendar
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {googleToken
                          ? "Connected for this browser session."
                          : "Connect to show and add Google events."}
                      </p>
                    </div>
                    <button
                      onClick={
                        googleToken
                          ? disconnectGoogleCalendar
                          : connectGoogleCalendar
                      }
                      disabled={isGoogleLoading}
                      className={`rounded-lg px-3 py-2 text-xs font-bold text-white transition-colors ${
                        googleToken
                          ? "bg-red-500/80 hover:bg-red-500"
                          : theme.primary
                      } disabled:opacity-60`}
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : googleToken ? (
                        "Disconnect"
                      ) : (
                        "Connect"
                      )}
                    </button>
                  </div>
                  {googleError && (
                    <p className="mt-3 text-xs text-red-300">{googleError}</p>
                  )}
                </div>

                {googleToken && googleCalendars.length > 0 && (
                  <>
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                        Visible Calendars
                      </p>
                      <div className="max-h-48 space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                        {googleCalendars.map((calendar) => (
                          <label
                            key={calendar.id}
                            className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm text-gray-300"
                          >
                            <input
                              type="checkbox"
                              checked={visibleGoogleCalendarIds.includes(
                                calendar.id,
                              )}
                              onChange={() =>
                                toggleGoogleCalendarVisibility(calendar.id)
                              }
                              className="h-4 w-4 accent-blue-500"
                            />
                            <span
                              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                              style={{
                                backgroundColor: calendar.backgroundColor,
                              }}
                            />
                            <span className="truncate">{calendar.summary}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {isAdding && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.form
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onSubmit={handleSave}
              className="relative z-10 w-full max-w-md bg-gray-900 border border-white/10 p-6 rounded-2xl shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus className={theme.text} size={22} />
                  Add Event
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">
                    Title
                  </label>
                  <input
                    value={eventForm.title}
                    onChange={(event) =>
                      setEventForm({ ...eventForm, title: event.target.value })
                    }
                    placeholder="e.g. Dentist appointment"
                    className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none ${theme.focus}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={eventForm.date}
                      onChange={(event) =>
                        setEventForm({
                          ...eventForm,
                          date: event.target.value,
                          endDate:
                            eventForm.endDate < event.target.value
                              ? event.target.value
                              : eventForm.endDate,
                        })
                      }
                      className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none [color-scheme:dark] ${theme.focus}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">
                      End Date
                    </label>
                    <input
                      type="date"
                      min={eventForm.date}
                      value={eventForm.endDate}
                      onChange={(event) =>
                        setEventForm({
                          ...eventForm,
                          endDate: event.target.value,
                        })
                      }
                      className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none [color-scheme:dark] ${theme.focus}`}
                    />
                  </div>
                </div>

                <div>
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">
                      Time
                    </label>
                    <input
                      type="time"
                      value={eventForm.time}
                      onChange={(event) =>
                        setEventForm({ ...eventForm, time: event.target.value })
                      }
                      className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none [color-scheme:dark] ${theme.focus}`}
                    />
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">
                    Note
                  </label>
                  <input
                    value={eventForm.note}
                    onChange={(event) =>
                      setEventForm({ ...eventForm, note: event.target.value })
                    }
                    placeholder="Optional"
                    className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none ${theme.focus}`}
                  />
                </div>

                {googleToken && (
                  <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                    <label className="flex items-center justify-between gap-3 text-sm text-gray-300">
                      <span>Save to Google Calendar</span>
                      <input
                        type="checkbox"
                        checked={saveToGoogle}
                        onChange={(event) =>
                          setSaveToGoogle(event.target.checked)
                        }
                        className="h-4 w-4 accent-blue-500"
                      />
                    </label>
                    {saveToGoogle && (
                      <select
                        value={targetGoogleCalendarId}
                        onChange={(event) =>
                          setTargetGoogleCalendarId(event.target.value)
                        }
                        className={`w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none ${theme.focus}`}
                      >
                        {googleCalendars
                          .filter((calendar) =>
                            ["owner", "writer"].includes(
                              calendar.accessRole || "",
                            ),
                          )
                          .map((calendar) => (
                            <option key={calendar.id} value={calendar.id}>
                              {calendar.summary}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !eventForm.title.trim()}
                    className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 ${theme.primary} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isSaving ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <Save size={18} />
                        Save
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CalendarWidget;
