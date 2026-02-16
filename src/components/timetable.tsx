import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Save,
  Loader2,
  Lock,
  LogOut,
  Coffee,
  Timer,
  X,
} from "lucide-react";
import { db, auth, googleProvider } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
} from "firebase/firestore";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

// --- Types ---
export type AccentColor =
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "pink"
  | "red";

type ClassItem = {
  id: string;
  day: string;
  time: string;
  subject: string;
  room: string;
  type: "class";
};

type BreakItem = {
  id: string;
  time: string;
  subject: string;
  type: "break";
  duration: number;
};

type ScheduleItem = ClassItem | BreakItem;

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// --- THEME CONFIGURATION ---
const themeConfig: Record<
  AccentColor,
  {
    primary: string;
    bg: string;
    text: string;
    badge: string;
    border: string;
    icon: string;
  }
> = {
  blue: {
    primary: "bg-blue-500",
    bg: "bg-blue-500/20",
    text: "text-blue-200",
    badge: "text-blue-300 bg-blue-500/10",
    border: "focus:border-blue-500",
    icon: "hover:text-blue-400",
  },
  green: {
    primary: "bg-emerald-500",
    bg: "bg-emerald-500/20",
    text: "text-emerald-200",
    badge: "text-emerald-300 bg-emerald-500/10",
    border: "focus:border-emerald-500",
    icon: "hover:text-emerald-400",
  },
  purple: {
    primary: "bg-violet-500",
    bg: "bg-violet-500/20",
    text: "text-violet-200",
    badge: "text-violet-300 bg-violet-500/10",
    border: "focus:border-violet-500",
    icon: "hover:text-violet-400",
  },
  orange: {
    primary: "bg-amber-500",
    bg: "bg-amber-500/20",
    text: "text-amber-200",
    badge: "text-amber-300 bg-amber-500/10",
    border: "focus:border-amber-500",
    icon: "hover:text-amber-400",
  },
  pink: {
    primary: "bg-rose-500",
    bg: "bg-rose-500/20",
    text: "text-rose-200",
    badge: "text-rose-300 bg-rose-500/10",
    border: "focus:border-rose-500",
    icon: "hover:text-rose-400",
  },
  red: {
    primary: "bg-red-500",
    bg: "bg-red-500/20",
    text: "text-red-200",
    badge: "text-red-300 bg-red-500/10",
    border: "focus:border-red-500",
    icon: "hover:text-red-400",
  },
};

// --- Helpers ---
const parseMinutes = (timeStr: string) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + (minutes || 0);
};

const getTimeRange = (timeString: string) => {
  const parts = timeString.split(/-|to/).map((s) => s.trim());
  if (parts.length < 2)
    return { start: parseMinutes(parts[0]), end: parseMinutes(parts[0]) + 60 };
  return { start: parseMinutes(parts[0]), end: parseMinutes(parts[1]) };
};

// --- NEW MODAL COMPONENT ---
const AddClassModal = ({
  isOpen,
  onClose,
  onSave,
  newClass,
  setNewClass,
  theme,
}: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative z-10 w-full max-w-md bg-gray-900 border border-white/10 p-6 rounded-2xl shadow-2xl backdrop-blur-xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Plus className={theme.text} size={24} /> Add New Class
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">
              Time Range
            </label>
            <input
              placeholder="09:00 - 10:00"
              value={newClass.time}
              onChange={(e) =>
                setNewClass({ ...newClass, time: e.target.value })
              }
              className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none ${theme.border}`}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">
              Subject Name
            </label>
            <input
              placeholder="Mathematics"
              value={newClass.subject}
              onChange={(e) =>
                setNewClass({ ...newClass, subject: e.target.value })
              }
              className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none ${theme.border}`}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">
              Room / Location
            </label>
            <input
              placeholder="Room 101"
              value={newClass.room}
              onChange={(e) =>
                setNewClass({ ...newClass, room: e.target.value })
              }
              className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none ${theme.border}`}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 ${theme.primary}`}
            >
              <Save size={18} /> Save Class
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const TimetableWidget = ({
  accentColor = "blue",
}: {
  accentColor?: AccentColor;
}) => {
  const theme = themeConfig[accentColor];

  // Current Time State
  const [now, setNow] = useState(new Date());

  const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const initialDay = daysOfWeek.includes(todayStr) ? todayStr : "Monday";

  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [rawSchedule, setRawSchedule] = useState<Record<string, ClassItem[]>>(
    {},
  );
  const [displaySchedule, setDisplaySchedule] = useState<ScheduleItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false); // Controls Modal
  const [newClass, setNewClass] = useState({ time: "", subject: "", room: "" });

  // --- 1. Tick Timer ---
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- 2. Listeners (Auth & Data) ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "classes"));
    const unsub = onSnapshot(q, (snapshot) => {
      const fetched: Record<string, ClassItem[]> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const day = data.day;
        if (!fetched[day]) fetched[day] = [];
        fetched[day].push({
          id: doc.id,
          type: "class",
          day,
          time: data.time,
          subject: data.subject,
          room: data.room,
        });
      });
      setRawSchedule(fetched);
      setIsLoadingData(false);
    });
    return () => unsub();
  }, []);

  // --- 3. Process Schedule & Breaks ---
  useEffect(() => {
    const classes = rawSchedule[selectedDay] || [];
    const sorted = [...classes].sort(
      (a, b) => getTimeRange(a.time).start - getTimeRange(b.time).start,
    );
    const withBreaks: ScheduleItem[] = [];

    sorted.forEach((current, index) => {
      withBreaks.push(current);
      const next = sorted[index + 1];
      if (next) {
        const currentEnd = getTimeRange(current.time).end;
        const nextStart = getTimeRange(next.time).start;
        const gap = nextStart - currentEnd;

        if (gap > 0) {
          const breakStart = current.time.split("-")[1]?.trim() || "";
          const breakEnd = next.time.split("-")[0]?.trim() || "";
          withBreaks.push({
            id: `break-${index}`,
            type: "break",
            time: `${breakStart} - ${breakEnd}`,
            subject: "Break",
            duration: gap,
          });
        }
      }
    });
    setDisplaySchedule(withBreaks);
  }, [rawSchedule, selectedDay]);

  // --- 4. Active Class Logic ---
  const getCurrentStatus = (itemTime: string) => {
    if (selectedDay !== todayStr) return null;

    const { start, end } = getTimeRange(itemTime);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (currentMinutes >= start && currentMinutes < end) {
      const totalDuration = end - start;
      const elapsed = currentMinutes - start;
      const percent = Math.min(
        100,
        Math.max(0, (elapsed / totalDuration) * 100),
      );
      const remaining = end - currentMinutes;
      return { isActive: true, percent, remaining };
    }
    return null;
  };

  // --- Handlers ---
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error(e);
    }
  };
  const handleLogout = () => signOut(auth);

  const handleAddClass = async () => {
    if (!newClass.subject || !newClass.time || !user) return;
    try {
      await addDoc(collection(db, "classes"), {
        day: selectedDay,
        time: newClass.time,
        subject: newClass.subject,
        room: newClass.room,
        createdAt: new Date(),
      });
      setNewClass({ time: "", subject: "", room: "" });
      setIsAdding(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (confirm("Delete this class?")) await deleteDoc(doc(db, "classes", id));
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        // FIXED: Removed max-w-2xl so it fills the parent container from Home.tsx
        className="w-full h-full bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden relative"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 border-b border-white/10 pb-4 gap-4">
          <div className={`flex items-center gap-2 ${theme.text}`}>
            <Calendar size={20} />
            <span className="font-semibold tracking-wide">Weekly Schedule</span>

            {!isAuthLoading && user ? (
              <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-3">
                <button
                  onClick={() => setIsAdding(true)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                  title="Add Class"
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                className={`ml-2 text-white/20 ${theme.icon}`}
              >
                <Lock size={14} />
              </button>
            )}
          </div>

          <div className="flex gap-1 bg-black/20 p-1 rounded-lg overflow-x-auto max-w-full">
            {daysOfWeek.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                // FIXED: Fixed width (w-12) and centered content for stability
                className={`w-12 py-1 text-xs rounded-md whitespace-nowrap transition-colors flex justify-center ${
                  selectedDay === day
                    ? `${theme.primary} text-white`
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-3 min-h-[200px]">
          {isLoadingData ? (
            <div className="flex justify-center py-10 text-gray-400">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-3"
              >
                {displaySchedule.length > 0 ? (
                  displaySchedule.map((item) => {
                    const status = getCurrentStatus(item.time);
                    const isNow = !!status;

                    return item.type === "class" ? (
                      // --- CLASS ITEM ---
                      <div
                        key={item.id}
                        className={`group flex flex-col p-3 rounded-xl border transition-all ${
                          isNow
                            ? `bg-white/10 border-white/30 shadow-lg scale-[1.02]`
                            : `bg-white/5 border-white/5 hover:border-white/20`
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-4">
                            <div
                              className={`flex items-center gap-2 text-xs font-mono px-2 py-1 rounded ${isNow ? "bg-white text-black font-bold" : theme.badge}`}
                            >
                              <Clock size={12} /> {item.time}
                            </div>
                            <div>
                              <div
                                className={`font-medium ${isNow ? "text-white text-lg" : "text-gray-100"}`}
                              >
                                {item.subject}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.room}
                              </div>
                            </div>
                          </div>
                          {user && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-400/10 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        {isNow && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            className="mt-3 w-full"
                          >
                            <div className="flex justify-between text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-1">
                              <span className="flex items-center gap-1">
                                <Timer size={10} /> Live
                              </span>
                              <span className={theme.text}>
                                {status.remaining} min left
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full ${theme.primary}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${status.percent}%` }}
                                transition={{ duration: 1 }}
                              />
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ) : (
                      // --- BREAK ITEM ---
                      <div
                        key={item.id}
                        className="flex items-center justify-center p-2 rounded-lg bg-white/5 border border-dashed border-white/10 text-gray-500 text-xs opacity-60 hover:opacity-100 transition-opacity"
                      >
                        <Coffee size={12} className="mr-2" />
                        <span className="font-mono mr-2">{item.time}</span>
                        <span>Break ({item.duration} min)</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500 italic">
                    No classes scheduled.
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      {/* --- RENDER MODAL OUTSIDE THE MAIN WIDGET DIV --- */}
      <AnimatePresence>
        {isAdding && (
          <AddClassModal
            isOpen={isAdding}
            onClose={() => setIsAdding(false)}
            onSave={handleAddClass}
            newClass={newClass}
            setNewClass={setNewClass}
            theme={theme}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default TimetableWidget;
