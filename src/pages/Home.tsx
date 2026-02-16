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
  Layout,
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
  // CHANGED: Increased width from 800px to 1000px
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
];

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

const WidgetModal = ({
  onClose,
  visibleWidgets,
  toggleWidget,
  widgetOrder,
  moveWidget,
}: {
  onClose: () => void;
  visibleWidgets: Record<string, boolean>;
  toggleWidget: (id: string) => void;
  widgetOrder: string[];
  moveWidget: (index: number, direction: "up" | "down") => void;
}) => {
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
        className="relative z-10 w-full max-w-sm bg-gray-900/90 border border-white/10 p-6 rounded-3xl shadow-2xl backdrop-blur-xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layout size={20} className="text-blue-400" /> Manage Widgets
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-semibold">
            Visible & Order
          </p>
          {widgetOrder.map((id, index) => {
            const config = ALL_WIDGETS_CONFIG.find((w) => w.id === id);
            if (!config) return null;

            return (
              <div
                key={id}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  visibleWidgets[id]
                    ? "bg-blue-500/10 border-blue-500/30"
                    : "bg-white/5 border-white/5 opacity-60"
                }`}
              >
                <button
                  onClick={() => toggleWidget(id)}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      visibleWidgets[id]
                        ? "bg-blue-400 border-blue-400"
                        : "border-gray-500"
                    }`}
                  >
                    {visibleWidgets[id] && (
                      <div className="w-1.5 h-1.5 bg-black rounded-full" />
                    )}
                  </div>
                  <span
                    className={`font-medium ${visibleWidgets[id] ? "text-white" : "text-gray-400"}`}
                  >
                    {config.label}
                  </span>
                </button>

                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveWidget(index, "up")}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => moveWidget(index, "down")}
                    disabled={index === widgetOrder.length - 1}
                    className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
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
  const [widgetModal, setWidgetModal] = useState(false);
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
    const newOrder = [...widgetOrder];
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

  return (
    <div className="relative flex flex-col items-center h-screen text-white overflow-hidden font-sans">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bg}')`, filter: "brightness(0.5)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full mx-auto px-4 flex flex-col items-center pt-10 pb-10 flex-1 overflow-y-auto xl:overflow-hidden scrollbar-thin"
      >
        <h1 className="mb-2 text-4xl md:text-6xl font-bold tracking-tight text-white drop-shadow-2xl text-center">
          {greet}
        </h1>
        <p className="mb-8 md:mb-12 text-lg md:text-xl text-gray-200 font-light tracking-wide text-center">
          Stay focused.
        </p>
        <GoogleSearch />

        {/* --- DYNAMIC LAYOUT FIX --- */}
        <div className="mt-8 md:mt-12 w-full flex justify-center px-4">
          <div
            className="flex flex-col xl:flex-row items-center xl:items-start 
                       xl:overflow-x-auto xl:pb-6 scrollbar-thin 
                       xl:snap-x 
                       w-full xl:w-fit xl:max-w-full gap-6"
          >
            {widgetOrder.map((id) => {
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

        {/* Footer Buttons */}
        <div className="mt-12 flex flex-wrap justify-center gap-4 pb-10">
          <button
            onClick={() => setDrawer(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-300 bg-black/30 hover:bg-black/50 hover:text-white rounded-full backdrop-blur-sm border border-white/5"
          >
            <ImageIcon size={16} />
            <span>Customize</span>
          </button>

          <button
            onClick={() => setWidgetModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-300 bg-black/30 hover:bg-black/50 hover:text-white rounded-full backdrop-blur-sm border border-white/5"
          >
            <Layout size={16} />
            <span>Widgets</span>
          </button>

          <Link
            to="/about"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-300 bg-black/30 hover:bg-black/50 hover:text-white rounded-full backdrop-blur-sm border border-white/5"
          >
            <Settings size={16} />
            <span>Settings</span>
          </Link>
          {user ? (
            <button
              onClick={() => signOut(auth)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-red-300 bg-black/30 hover:bg-red-500/20 hover:text-red-200 rounded-full backdrop-blur-sm border border-white/5"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          ) : (
            <button
              onClick={() => setLogin(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-300 bg-black/30 hover:bg-black/50 hover:text-white rounded-full backdrop-blur-sm border border-white/5"
            >
              <LogIn size={16} />
              <span>Login</span>
            </button>
          )}
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
      <AnimatePresence>
        {widgetModal && (
          <WidgetModal
            onClose={() => setWidgetModal(false)}
            visibleWidgets={visibleWidgets}
            toggleWidget={toggleWidget}
            widgetOrder={widgetOrder}
            moveWidget={moveWidget}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
export default Home;
