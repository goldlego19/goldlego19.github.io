import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Calendar,
  DollarSign,
  X,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { type AccentColor } from "./timetable";

// --- CONFIGURATION ---
const STIPEND_DATES = [
  "2026-02-25",
  "2026-03-25",
  "2026-04-22",
  "2026-05-20",
  "2026-06-17",
  "2026-07-15",
  "2026-08-12",
];

// --- HELPER: SAFE DATE PARSER ---
const parseDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// --- MODAL COMPONENT ---
const StipendModal = ({
  onClose,
  accentColor,
}: {
  onClose: () => void;
  accentColor: AccentColor;
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter and Sort Dates
  const allDates = STIPEND_DATES.map((d) => ({
    raw: d,
    date: parseDate(d),
    isPast: parseDate(d).getTime() < today.getTime(),
    isNext: false, // Will calculate below
  })).sort((a, b) => a.date.getTime() - b.date.getTime());

  // Mark the very next date
  const nextIndex = allDates.findIndex((d) => !d.isPast);
  if (nextIndex !== -1) allDates[nextIndex].isNext = true;

  // Color Helper for Modal
  const getModalColor = (type: "text" | "bg" | "border") => {
    const colors = {
      blue: {
        text: "text-blue-400",
        bg: "bg-blue-500/20",
        border: "border-blue-500/50",
      },
      green: {
        text: "text-emerald-400",
        bg: "bg-emerald-500/20",
        border: "border-emerald-500/50",
      },
      purple: {
        text: "text-violet-400",
        bg: "bg-violet-500/20",
        border: "border-violet-500/50",
      },
      orange: {
        text: "text-amber-400",
        bg: "bg-amber-500/20",
        border: "border-amber-500/50",
      },
      pink: {
        text: "text-rose-400",
        bg: "bg-rose-500/20",
        border: "border-rose-500/50",
      },
      red: {
        text: "text-red-400",
        bg: "bg-red-500/20",
        border: "border-red-500/50",
      },
    };
    return colors[accentColor][type];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative z-10 w-full max-w-sm bg-gray-900/90 border border-white/10 p-6 rounded-3xl shadow-2xl backdrop-blur-xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar size={20} className={getModalColor("text")} />
            Stipend Schedule
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
          {allDates.map((item, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                item.isNext
                  ? `${getModalColor("bg")} ${getModalColor("border")} ring-1 ring-white/10`
                  : item.isPast
                    ? "bg-white/5 border-transparent opacity-50"
                    : "bg-white/5 border-white/5 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                {item.isPast ? (
                  <CheckCircle2 size={18} className="text-gray-500" />
                ) : item.isNext ? (
                  <Clock size={18} className={getModalColor("text")} />
                ) : (
                  <div className="w-4.5 h-4.5 rounded-full border-2 border-gray-600" />
                )}
                <div>
                  <p
                    className={`font-medium ${item.isNext ? "text-white" : "text-gray-300"}`}
                  >
                    {item.date.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.date.getFullYear()}
                  </p>
                </div>
              </div>

              {item.isNext && (
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-black/20 ${getModalColor("text")}`}
                >
                  Next
                </span>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// --- MAIN WIDGET ---
const MoneyWidget = ({ accentColor }: { accentColor: AccentColor }) => {
  const [paycheck, setPaycheck] = useState({ days: 0, progress: 0, date: "" });
  const [stipend, setStipend] = useState({ days: 0, progress: 0, date: "" });
  const [showModal, setShowModal] = useState(false);

  // Theme Helpers
  const getColor = (type: "text" | "stroke" | "bg") => {
    const colors = {
      blue: { text: "text-blue-400", stroke: "#60A5FA", bg: "bg-blue-500/10" },
      green: {
        text: "text-emerald-400",
        stroke: "#34D399",
        bg: "bg-emerald-500/10",
      },
      purple: {
        text: "text-violet-400",
        stroke: "#A78BFA",
        bg: "bg-violet-500/10",
      },
      orange: {
        text: "text-amber-400",
        stroke: "#FBBF24",
        bg: "bg-amber-500/10",
      },
      pink: { text: "text-rose-400", stroke: "#FB7185", bg: "bg-rose-500/10" },
      red: { text: "text-red-400", stroke: "#F87171", bg: "bg-red-500/10" },
    };
    return colors[accentColor][type];
  };

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // --- 1. PAYCHECK LOGIC ---
    const getPayDate = (y: number, m: number) => {
      let d = new Date(y, m + 1, 0);
      if (d.getDay() === 6) d.setDate(d.getDate() - 1);
      else if (d.getDay() === 0) d.setDate(d.getDate() - 2);
      return d;
    };

    let payDate = getPayDate(today.getFullYear(), today.getMonth());
    if (today > payDate) {
      payDate = getPayDate(today.getFullYear(), today.getMonth() + 1);
    }

    const payDiff = payDate.getTime() - today.getTime();
    const payDays = Math.ceil(payDiff / (1000 * 60 * 60 * 24));
    const payProgress = Math.max(0, Math.min(1, (30 - payDays) / 30));

    setPaycheck({
      days: payDays,
      progress: payProgress,
      date: payDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    });

    // --- 2. STIPEND LOGIC ---
    const nextStipend = STIPEND_DATES.map((d) => parseDate(d))
      .sort((a, b) => a.getTime() - b.getTime())
      .find((d) => d.getTime() > today.getTime());

    if (nextStipend) {
      const stipDiff = nextStipend.getTime() - today.getTime();
      const stipDays = Math.ceil(stipDiff / (1000 * 60 * 60 * 24));
      const stipProgress = Math.max(0, Math.min(1, (90 - stipDays) / 90));

      setStipend({
        days: stipDays,
        progress: stipProgress,
        date: nextStipend.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      });
    } else {
      setStipend({ days: 0, progress: 1, date: "Done" });
    }
  }, []);

  // Small Circle Component
  const MiniCircle = ({
    progress,
    days,
    label,
    date,
    icon: Icon,
    onClick,
  }: any) => {
    const r = 40;
    const c = 2 * Math.PI * r;
    const isInteractive = !!onClick;

    return (
      <div
        onClick={onClick}
        className={`flex flex-col items-center gap-2 group ${isInteractive ? "cursor-pointer" : ""}`}
      >
        <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
          <svg className="transform -rotate-90 w-24 h-24">
            <circle
              cx="48"
              cy="48"
              r={r}
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              className="text-white/5"
            />
            <motion.circle
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: c - progress * c }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              cx="48"
              cy="48"
              r={r}
              stroke={getColor("stroke")}
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={c}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Icon size={14} className={getColor("text")} />
            <span className="text-xl font-bold text-white">{days}</span>
            <span className="text-[9px] text-gray-400 uppercase">Days</span>
          </div>

          {/* Hover Hint for Interactive elements */}
          {isInteractive && (
            <div className="absolute inset-0 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        <div className="text-center">
          <p className="text-xs font-medium text-gray-300 flex items-center gap-1 justify-center">
            {label}
            {isInteractive && (
              <span className="w-1 h-1 rounded-full bg-blue-400/50" />
            )}
          </p>
          <p className={`text-[10px] font-mono opacity-60 ${getColor("text")}`}>
            {date}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full h-full min-h-[150px] bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col justify-between"
      >
        <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-4">
          <div className={`p-1.5 rounded-md ${getColor("bg")}`}>
            <DollarSign size={16} className={getColor("text")} />
          </div>
          <span
            className={`text-sm font-semibold tracking-wide ${getColor("text")}`}
          >
            Finance Tracker
          </span>
        </div>

        <div className="flex items-start justify-around w-full pb-2">
          <MiniCircle
            progress={paycheck.progress}
            days={paycheck.days}
            label="Paycheck"
            date={paycheck.date}
            icon={Wallet}
          />
          <div className="h-20 w-px bg-white/10 self-center" />
          <MiniCircle
            progress={stipend.progress}
            days={stipend.days}
            label="Stipend"
            date={stipend.date}
            icon={Calendar}
            onClick={() => setShowModal(true)} // <-- Added Click Handler
          />
        </div>
      </motion.div>

      {/* MODAL */}
      <AnimatePresence>
        {showModal && (
          <StipendModal
            onClose={() => setShowModal(false)}
            accentColor={accentColor}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default MoneyWidget;
