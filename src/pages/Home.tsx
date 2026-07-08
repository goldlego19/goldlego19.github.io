import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Image as ImageIcon,
  X,
  Palette,
  LogIn,
  LogOut,
  Loader2,
  Menu,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { auth } from "../firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import GoogleSearch from "../components/searchbar";
import TimetableWidget, { type AccentColor } from "../components/timetable";
import StatusWidget from "../components/status-widget";
import BookmarksWidget from "../components/bookmarks";
import MoneyWidget from "../components/money-widget";
import AssignmentsWidget from "../components/assignments";
import TimezonesWidget from "../components/timezones";
import CalendarWidget from "../components/calendar-widget";

// --- CONFIGURATION ---
const bgModules = import.meta.glob(
  "../assets/backgrounds/*.{png,jpg,jpeg,webp}",
  { eager: true },
);
const localBackgrounds = Object.values(bgModules).map(
  (mod: any) => mod.default,
);
const defaultBg =
  "https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop";
const allBackgrounds =
  localBackgrounds.length > 0 ? localBackgrounds : [defaultBg];

// WIDGET CONFIGURATION
const ALL_WIDGETS_CONFIG = [
  {
    id: "status",
    label: "Status",
    component: StatusWidget,
    width: "xl:w-[400px]",
  },
  {
    id: "money",
    label: "Money & Pay",
    component: MoneyWidget,
    width: "xl:w-[400px]",
  },
  {
    id: "timezones",
    label: "World Times",
    component: TimezonesWidget,
    width: "xl:w-[400px]",
  },
  {
    id: "calendar",
    label: "Calendar",
    component: CalendarWidget,
    width: "xl:w-[600px]",
  },
  {
    id: "timetable",
    label: "Timetable",
    component: TimetableWidget,
    width: "xl:w-[600px]",
  },
  {
    id: "bookmarks",
    label: "Bookmarks",
    component: BookmarksWidget,
    width: "xl:w-[400px]",
  },
  {
    id: "assignments",
    label: "Assignments",
    component: AssignmentsWidget,
    width: "xl:w-[400px]",
  },
];

const getDisplayWidgetOrder = (
  widgetOrder: string[],
  visibleWidgets: Record<string, boolean>,
) =>
  [...widgetOrder].sort((a, b) => {
    const aVisible = visibleWidgets[a] ? 0 : 1;
    const bVisible = visibleWidgets[b] ? 0 : 1;
    if (aVisible !== bVisible) return aVisible - bVisible;
    return widgetOrder.indexOf(a) - widgetOrder.indexOf(b);
  });

// --- MODALS ---

const LoginModal = ({ onClose }: { onClose: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      if (result.user.email?.toLowerCase() !== "gremblinu@gmail.com") {
        await signOut(auth);
        setError("Access Denied");
        return;
      }
      onClose();
    } catch (err) {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-sm bg-gray-900/90 border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-xl text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>
        <div className="mb-6 flex justify-center text-blue-400">
          <LogIn size={48} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Admin Access</h2>
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border-red-500/50 rounded-xl text-red-200 text-xs font-bold">
            {error}
          </div>
        )}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-gray-900 hover:bg-gray-200 font-bold py-3 rounded-xl flex items-center justify-center gap-3"
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <span>Sign in with Google</span>
          )}
        </button>
      </div>
    </div>
  );
};

const CustomizationDrawer = ({
  currentBg,
  currentColor,
  onSelectBg,
  onSelectColor,
  onClose,
}: any) => {
  const colors: AccentColor[] = [
    "blue",
    "green",
    "purple",
    "orange",
    "pink",
    "red",
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="relative z-10 w-full bg-gray-900/95 border-t border-gray-700 p-6 shadow-2xl"
      >
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Palette size={18} /> Customize
            </h3>
            <button onClick={onClose}>
              <X size={24} />
            </button>
          </div>
          <div className="flex gap-4">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => onSelectColor(c)}
                className={`w-12 h-12 rounded-full border-4 ${currentColor === c ? "border-white" : "border-transparent"} bg-${c === "blue" ? "blue" : c === "green" ? "emerald" : c === "purple" ? "violet" : c === "orange" ? "amber" : c === "pink" ? "rose" : "red"}-500`}
              />
            ))}
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {allBackgrounds.map((bg, i) => (
              <button
                key={i}
                onClick={() => onSelectBg(bg)}
                className={`w-32 h-20 rounded-lg overflow-hidden border-2 ${currentBg === bg ? "border-blue-500" : "border-transparent"}`}
              >
                <img src={bg} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const FloatingWidgetTabs = ({
  isOpen,
  onToggle,
  visibleWidgets,
  toggleWidget,
  widgetOrder,
  moveWidget,
  activeWidget,
  setActiveWidget,
  accentColor,
  user,
  onCustomize,
  onLogin,
  onLogout,
}: {
  isOpen: boolean;
  onToggle: () => void;
  visibleWidgets: Record<string, boolean>;
  toggleWidget: (id: string) => void;
  widgetOrder: string[];
  moveWidget: (index: number, direction: "up" | "down") => void;
  activeWidget: string;
  setActiveWidget: (id: string) => void;
  accentColor: AccentColor;
  user: User | null;
  onCustomize: () => void;
  onLogin: () => void;
  onLogout: () => void;
}) => {
  const [activeMenuTab, setActiveMenuTab] = useState<"widgets" | "actions">(
    "widgets",
  );
  const config = ALL_WIDGETS_CONFIG.find((widget) => widget.id === activeWidget);
  const WidgetComponent = config?.component;
  const orderedWidgetTabs = getDisplayWidgetOrder(widgetOrder, visibleWidgets);

  return (
    <div className="fixed left-4 top-4 z-50 flex flex-col items-start gap-3">
      <button
        onClick={onToggle}
        className="h-11 w-11 inline-flex items-center justify-center rounded-full bg-black/35 hover:bg-black/55 text-gray-200 hover:text-white backdrop-blur-xl border border-white/10 shadow-2xl transition-colors"
        title="Widgets"
      >
        {isOpen ? <X size={18} /> : <Menu size={20} />}
      </button>
      <button
        onClick={user ? onLogout : onLogin}
        className={`h-11 w-11 inline-flex items-center justify-center rounded-full backdrop-blur-xl border shadow-2xl transition-colors ${
          user
            ? "border-red-500/10 bg-red-500/15 text-red-300 hover:bg-red-500/25 hover:text-red-200"
            : "border-white/10 bg-black/35 text-gray-200 hover:bg-black/55 hover:text-white"
        }`}
        title={user ? "Logout" : "Login"}
      >
        {user ? <LogOut size={18} /> : <LogIn size={18} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -12, y: -8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -12, y: -8 }}
            className="w-[calc(100vw-2rem)] max-w-2xl max-h-[calc(100dvh-5.5rem)] overflow-hidden rounded-2xl border border-white/10 bg-gray-950/90 p-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-blue-300">
                <Menu size={18} />
                <span className="text-sm font-semibold tracking-wide">
                  Menu
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-gray-500">
                Dashboard
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 rounded-xl border border-white/10 bg-black/20 p-1">
              <button
                onClick={() => setActiveMenuTab("widgets")}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  activeMenuTab === "widgets"
                    ? "bg-blue-500/20 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Widgets
              </button>
              <button
                onClick={() => setActiveMenuTab("actions")}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  activeMenuTab === "actions"
                    ? "bg-blue-500/20 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Actions
              </button>
            </div>

            {activeMenuTab === "actions" ? (
              <div className="mt-3 grid gap-2">
                <button
                  onClick={onCustomize}
                  className="inline-flex items-center justify-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <ImageIcon size={16} />
                  <span>Customize</span>
                </button>
                <Link
                  to="/about"
                  className="inline-flex items-center justify-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
                  {orderedWidgetTabs.map((id) => {
                    const widget = ALL_WIDGETS_CONFIG.find(
                      (item) => item.id === id,
                    );
                    if (!widget) return null;
                    const isActive = activeWidget === id;
                    const isVisible = visibleWidgets[id];

                    return (
                      <button
                        key={id}
                        onClick={() => setActiveWidget(id)}
                        className={`flex-shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                          isActive
                            ? "border-blue-500/50 bg-blue-500/20 text-white"
                            : isVisible
                              ? "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                              : "border-white/5 bg-white/[0.03] text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        {widget.label}
                      </button>
                    );
                  })}
                </div>

                {config && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/5 p-2">
                    <button
                      onClick={() => toggleWidget(config.id)}
                      className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <span
                        className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                          visibleWidgets[config.id]
                            ? "bg-blue-400 border-blue-400"
                            : "border-gray-500"
                        }`}
                      >
                        {visibleWidgets[config.id] && (
                          <span className="h-1.5 w-1.5 rounded-full bg-black" />
                        )}
                      </span>
                      {visibleWidgets[config.id]
                        ? "Shown on dashboard"
                        : "Hidden"}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          moveWidget(widgetOrder.indexOf(config.id), "up")
                        }
                        disabled={widgetOrder.indexOf(config.id) === 0}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                        title="Move left"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() =>
                          moveWidget(widgetOrder.indexOf(config.id), "down")
                        }
                        disabled={
                          widgetOrder.indexOf(config.id) ===
                          widgetOrder.length - 1
                        }
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                        title="Move right"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4 max-h-[calc(100dvh-17rem)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                  {WidgetComponent && (
                    <WidgetComponent accentColor={accentColor} />
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- MAIN COMPONENT ---

const Home = () => {
  const [bg, setBg] = useState(
    () => localStorage.getItem("wallpaper") || allBackgrounds[0],
  );
  const [accent, setAccent] = useState<AccentColor>(
    () => (localStorage.getItem("themeColor") as AccentColor) || "blue",
  );

  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const savedOrder = localStorage.getItem("widgetOrder");
    const defaultOrder = ALL_WIDGETS_CONFIG.map((w) => w.id);
    if (savedOrder) {
      const parsed = JSON.parse(savedOrder);
      const validSaved = parsed.filter((id: string) =>
        defaultOrder.includes(id),
      );
      const missing = defaultOrder.filter((id) => !validSaved.includes(id));
      return [...validSaved, ...missing];
    }
    return defaultOrder;
  });

  const [visibleWidgets, setVisibleWidgets] = useState<Record<string, boolean>>(
    () => {
      const saved = localStorage.getItem("visibleWidgets");
      if (saved) return JSON.parse(saved);
      return ALL_WIDGETS_CONFIG.reduce(
        (acc, w) => ({ ...acc, [w.id]: true }),
        {},
      );
    },
  );

  const [drawer, setDrawer] = useState(false);
  const [login, setLogin] = useState(false);
  const [widgetTabsOpen, setWidgetTabsOpen] = useState(false);
  const [activeWidgetTab, setActiveWidgetTab] = useState(ALL_WIDGETS_CONFIG[0].id);
  const [user, setUser] = useState<User | null>(null);
  const [greet, setGreet] = useState("");

  useEffect(() => {
    onAuthStateChanged(auth, setUser);
    const h = new Date().getHours();
    setGreet(
      h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening",
    );
  }, []);

  const toggleWidget = (id: string) => {
    const newState = { ...visibleWidgets, [id]: !visibleWidgets[id] };
    setVisibleWidgets(newState);
    localStorage.setItem("visibleWidgets", JSON.stringify(newState));
  };

  const moveWidget = (index: number, direction: "up" | "down") => {
    const newOrder = getDisplayWidgetOrder(widgetOrder, visibleWidgets);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex >= 0 && swapIndex < newOrder.length) {
      [newOrder[index], newOrder[swapIndex]] = [
        newOrder[swapIndex],
        newOrder[index],
      ];
      setWidgetOrder(newOrder);
      localStorage.setItem("widgetOrder", JSON.stringify(newOrder));
    }
  };
  const displayedWidgetOrder = getDisplayWidgetOrder(
    widgetOrder,
    visibleWidgets,
  );

 return (
    // Changed to h-[100dvh] for better mobile browser support
    <div className="relative flex flex-col items-center h-[100dvh] text-white overflow-hidden font-sans">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bg}')`, filter: "brightness(0.5)" }}
      />

      <FloatingWidgetTabs
        isOpen={widgetTabsOpen}
        onToggle={() => setWidgetTabsOpen((current) => !current)}
        visibleWidgets={visibleWidgets}
        toggleWidget={toggleWidget}
        widgetOrder={widgetOrder}
        moveWidget={moveWidget}
        activeWidget={activeWidgetTab}
        setActiveWidget={setActiveWidgetTab}
        accentColor={accent}
        user={user}
        onCustomize={() => setDrawer(true)}
        onLogin={() => setLogin(true)}
        onLogout={() => signOut(auth)}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        // Removed the hard pb-26 here. Padding is now handled dynamically below.
        className="relative z-10 w-full mx-auto px-4 flex flex-col items-center pt-8 flex-1 overflow-hidden"
      >
        <h1 className="mb-2 text-3xl md:text-5xl font-bold tracking-tight text-white drop-shadow-2xl text-center">
          {greet}
        </h1>
        <p className="mb-6 md:mb-8 text-base md:text-lg text-gray-200 font-light tracking-wide text-center">
          Stay focused.
        </p>
        <GoogleSearch />

        {/* --- DYNAMIC LAYOUT FIX --- */}
        {/* Added pb-8 for mobile padding, and xl:pb-32 so widgets don't hide under the pinned desktop bar */}
        <div className="mt-6 md:mt-8 w-full flex min-h-0 flex-1 justify-center px-4 pb-4">
          <div
            className="flex flex-col xl:flex-row items-center xl:items-start 
                       xl:overflow-x-auto xl:pb-6 scrollbar-thin 
                       xl:snap-x 
                       w-full xl:w-fit xl:max-w-full gap-6"
          >
            {displayedWidgetOrder.map((id) => {
              const config = ALL_WIDGETS_CONFIG.find((w) => w.id === id);
              const isVisible = visibleWidgets[id];
              if (!config || !isVisible) return null;

              const WidgetComponent = config.component;

              return (
                <div
                  key={id}
                  className={`w-full max-w-md xl:max-w-none ${config.width} xl:flex-shrink-0 xl:snap-center`}
                >
                  <WidgetComponent accentColor={accent} />
                </div>
              );
            })}
          </div>
        </div>

      </motion.div>

      <AnimatePresence>
        {drawer && (
          <CustomizationDrawer
            currentBg={bg}
            currentColor={accent}
            onSelectBg={(b: string) => {
              setBg(b);
              localStorage.setItem("wallpaper", b);
            }}
            onSelectColor={(c: AccentColor) => {
              setAccent(c);
              localStorage.setItem("themeColor", c);
            }}
            onClose={() => setDrawer(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {login && <LoginModal onClose={() => setLogin(false)} />}
      </AnimatePresence>
    </div>
  );
};
export default Home;
