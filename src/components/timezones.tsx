import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock3,
  Globe2,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
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

type SavedTimezone = {
  id: string;
  label: string;
  timezone: string;
};

type TimezoneForm = {
  label: string;
  timezone: string;
};

const themeConfig: Record<
  AccentColor,
  {
    text: string;
    iconBg: string;
    button: string;
    border: string;
    ring: string;
  }
> = {
  blue: {
    text: "text-blue-300",
    iconBg: "bg-blue-500/10",
    button: "bg-blue-500 hover:bg-blue-400",
    border: "focus:border-blue-500/60",
    ring: "border-blue-500/30 bg-blue-500/10",
  },
  green: {
    text: "text-emerald-300",
    iconBg: "bg-emerald-500/10",
    button: "bg-emerald-500 hover:bg-emerald-400",
    border: "focus:border-emerald-500/60",
    ring: "border-emerald-500/30 bg-emerald-500/10",
  },
  purple: {
    text: "text-violet-300",
    iconBg: "bg-violet-500/10",
    button: "bg-violet-500 hover:bg-violet-400",
    border: "focus:border-violet-500/60",
    ring: "border-violet-500/30 bg-violet-500/10",
  },
  orange: {
    text: "text-amber-300",
    iconBg: "bg-amber-500/10",
    button: "bg-amber-500 hover:bg-amber-400",
    border: "focus:border-amber-500/60",
    ring: "border-amber-500/30 bg-amber-500/10",
  },
  pink: {
    text: "text-rose-300",
    iconBg: "bg-rose-500/10",
    button: "bg-rose-500 hover:bg-rose-400",
    border: "focus:border-rose-500/60",
    ring: "border-rose-500/30 bg-rose-500/10",
  },
  red: {
    text: "text-red-300",
    iconBg: "bg-red-500/10",
    button: "bg-red-500 hover:bg-red-400",
    border: "focus:border-red-500/60",
    ring: "border-red-500/30 bg-red-500/10",
  },
};

const fallbackTimezones = [
  "Europe/Malta",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const getTimezoneOptions = () => {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone");
  }

  return fallbackTimezones;
};

const formatTime = (date: Date, timezone: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(date);

const formatDate = (date: Date, timezone: string) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  }).format(date);

const getOffset = (date: Date, timezone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  return parts.find((part) => part.type === "timeZoneName")?.value || "";
};

const toTitle = (timezone: string) =>
  timezone.split("/").pop()?.replace(/_/g, " ") || timezone;

const TimezonesWidget = ({
  accentColor = "blue",
}: {
  accentColor?: AccentColor;
}) => {
  const theme = themeConfig[accentColor];
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timezoneOptions = useMemo(getTimezoneOptions, []);

  const [now, setNow] = useState(new Date());
  const [user, setUser] = useState<User | null>(null);
  const [timezones, setTimezones] = useState<SavedTimezone[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newTimezone, setNewTimezone] = useState<TimezoneForm>({
    label: "",
    timezone: timezoneOptions.includes("Europe/Malta")
      ? "Europe/Malta"
      : timezoneOptions[0] || localTimezone,
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    const q = query(collection(db, "timezones"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setTimezones(
        snapshot.docs.map((snapshotDoc) => {
          const data = snapshotDoc.data();
          return {
            id: snapshotDoc.id,
            label: data.label || toTitle(data.timezone),
            timezone: data.timezone,
          };
        }),
      );
    });

    return () => unsub();
  }, []);

  const displayedTimezones = [
    {
      id: "local",
      label: "Current Location",
      timezone: localTimezone,
      isLocal: true,
    },
    ...timezones
      .filter((item) => item.timezone !== localTimezone)
      .map((item) => ({ ...item, isLocal: false })),
  ];

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !newTimezone.timezone) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "timezones"), {
        label: newTimezone.label.trim() || toTitle(newTimezone.timezone),
        timezone: newTimezone.timezone,
        createdAt: serverTimestamp(),
      });
      setNewTimezone({ label: "", timezone: newTimezone.timezone });
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding timezone:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (window.confirm("Remove this timezone?")) {
      await deleteDoc(doc(db, "timezones", id));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full h-full min-h-[300px] bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col"
    >
      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <div className={`flex items-center gap-2 ${theme.text}`}>
          <Globe2 size={20} />
          <span className="font-semibold tracking-wide">World Times</span>
        </div>

        {user && (
          <button
            onClick={() => setIsAdding((current) => !current)}
            className={`p-1.5 rounded-lg transition-colors ${isAdding ? "bg-red-500/20 text-red-400" : "hover:bg-white/10 text-gray-400 hover:text-white"}`}
            title={isAdding ? "Close" : "Add timezone"}
          >
            {isAdding ? <X size={16} /> : <Plus size={16} />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleAdd}
            className="mb-4 overflow-hidden space-y-2"
          >
            <input
              type="text"
              placeholder="Label (e.g. London)"
              value={newTimezone.label}
              onChange={(event) =>
                setNewTimezone({ ...newTimezone, label: event.target.value })
              }
              className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none ${theme.border}`}
            />
            <select
              value={newTimezone.timezone}
              onChange={(event) =>
                setNewTimezone({
                  ...newTimezone,
                  timezone: event.target.value,
                })
              }
              className={`w-full bg-gray-950/90 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none ${theme.border}`}
            >
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 rounded-lg text-xs font-bold text-white transition-all flex justify-center ${theme.button} disabled:opacity-60`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                "Save Timezone"
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
        <div className="space-y-3 pb-2">
          {displayedTimezones.map((item) => (
            <motion.div
              key={item.id}
              layout
              className={`group relative flex items-center justify-between gap-4 rounded-xl border p-3 transition-all ${
                item.isLocal
                  ? theme.ring
                  : "bg-white/5 border-white/5 hover:border-white/10"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`h-10 w-10 flex-shrink-0 rounded-lg flex items-center justify-center ${theme.iconBg} ${theme.text}`}
                >
                  {item.isLocal ? <MapPin size={18} /> : <Clock3 size={18} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-100 truncate">
                      {item.label}
                    </h3>
                    {item.isLocal && (
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-300">
                        Local
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono truncate">
                    {item.timezone} {getOffset(now, item.timezone)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-7 flex justify-center">
                  {user && !item.isLocal && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-gray-500 opacity-0 transition-all hover:bg-red-500/20 hover:text-red-300 group-hover:opacity-100"
                      title="Remove timezone"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-white tabular-nums leading-none">
                    {formatTime(now, item.timezone)}
                  </p>
                  <p className={`mt-1 text-[10px] font-mono ${theme.text}`}>
                    {formatDate(now, item.timezone)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default TimezonesWidget;
