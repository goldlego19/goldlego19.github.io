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
} from "lucide-react";

// --- FIREBASE IMPORTS ---
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

// --- Background Logic ---
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

// --- LOGIN MODAL COMPONENT ---
const LoginModal = ({ onClose }: { onClose: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();

    try {
      // 1. Open Google Popup
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // 2. SECURITY CHECK: Is this YOU?
      const ALLOWED_EMAIL = "gremblinu@gmail.com";

      // Case-insensitive check to be safe
      if (user.email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
        await signOut(auth); // Kick them out
        setError("Access Denied: You are not authorized.");
        setLoading(false);
        return;
      }

      // 3. Success
      onClose();
    } catch (err: any) {
      console.error(err);
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative z-10 w-full max-w-sm bg-gray-900/90 border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-xl text-center"
      >
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
        <p className="text-gray-400 text-sm mb-8">
          Restricted to authorized users only.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-xs font-bold">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-gray-900 hover:bg-gray-200 font-bold py-3 px-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            // Google "G" Icon
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          <span>Sign in with Google</span>
        </button>
      </motion.div>
    </div>
  );
};

// --- Customization Drawer ---
const CustomizationDrawer = ({
  currentBg,
  currentColor,
  onSelectBg,
  onSelectColor,
  onClose,
}: {
  currentBg: string;
  currentColor: AccentColor;
  onSelectBg: (url: string) => void;
  onSelectColor: (c: AccentColor) => void;
  onClose: () => void;
}) => {
  const colors: AccentColor[] = [
    "blue",
    "green",
    "purple",
    "orange",
    "pink",
    "red",
  ];

  const getColorClass = (c: string) => {
    switch (c) {
      case "blue":
        return "bg-blue-500";
      case "green":
        return "bg-emerald-500";
      case "purple":
        return "bg-violet-500";
      case "orange":
        return "bg-amber-500";
      case "pink":
        return "bg-rose-500";
      case "red":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative z-10 w-full bg-gray-900/95 border-t border-gray-700 p-6 shadow-2xl"
      >
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Palette size={18} /> Customize Appearance
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Accent Color
            </h4>
            <div className="flex gap-4">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => onSelectColor(c)}
                  className={`w-12 h-12 rounded-full border-4 transition-all ${getColorClass(c)} ${currentColor === c ? "border-white scale-110 shadow-lg" : "border-transparent hover:scale-105 opacity-80 hover:opacity-100"}`}
                />
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Wallpaper
            </h4>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {allBackgrounds.map((bg, index) => (
                <button
                  key={index}
                  onClick={() => onSelectBg(bg)}
                  className={`relative flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border-2 transition-all ${currentBg === bg ? "border-blue-500 scale-105" : "border-transparent hover:border-gray-500"}`}
                >
                  <img
                    src={bg}
                    alt="bg"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main Page Component ---
const Home = () => {
  const [bgImage, setBgImage] = useState(
    () => localStorage.getItem("wallpaper") || allBackgrounds[0],
  );
  const [accentColor, setAccentColor] = useState<AccentColor>(
    () => (localStorage.getItem("themeColor") as AccentColor) || "blue",
  );

  const [showDrawer, setShowDrawer] = useState(false);
  const [showLogin, setShowLogin] = useState(false); // New Login State
  const [user, setUser] = useState<User | null>(null); // New User State
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    // 1. Monitor Auth State
    const unsub = onAuthStateChanged(auth, (currentUser) =>
      setUser(currentUser),
    );

    // 2. Set Greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    return () => unsub();
  }, []);

  const handleBgChange = (newUrl: string) => {
    setBgImage(newUrl);
    localStorage.setItem("wallpaper", newUrl);
  };

  const handleColorChange = (newColor: AccentColor) => {
    setAccentColor(newColor);
    localStorage.setItem("themeColor", newColor);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="relative flex flex-col items-center min-h-screen text-white overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out"
        style={{
          backgroundImage: `url('${bgImage}')`,
          filter: "brightness(0.5) blur(0px)",
        }}
      />

      {/* Content Layer */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-7xl px-4 flex flex-col items-center pt-20 pb-10 overflow-y-auto h-full scrollbar-hide"
      >
        <h1 className="mb-2 text-6xl font-bold tracking-tight text-white drop-shadow-2xl text-center">
          {greeting}
        </h1>
        <p className="mb-12 text-xl text-gray-200 font-light tracking-wide text-center">
          Stay focused.
        </p>

        <GoogleSearch />

        {/* 3-COLUMN LAYOUT */}
        {/* UPDATED: Increased Grid Width and removed inner max-w restrictions */}
        <div className="mt-12 w-full grid grid-cols-1 xl:grid-cols-[300px_1fr_300px] gap-8 items-center">
          {/* Left: Status */}
          <div className="w-full flex justify-center xl:justify-start order-2 xl:order-1">
            <StatusWidget accentColor={accentColor} />
          </div>

          {/* Center: Timetable */}
          <div className="w-full flex justify-center order-1 xl:order-2">
            <div className="w-full">
              <TimetableWidget accentColor={accentColor} />
            </div>
          </div>

          {/* Right: Bookmarks */}
          <div className="w-full flex justify-center xl:justify-end order-3">
            <BookmarksWidget accentColor={accentColor} />
          </div>
        </div>

        {/* --- REPLACED SECTION END --- */}

        {/* Footer Buttons */}
        <div className="mt-16 flex flex-wrap justify-center gap-4 pb-10">
          <button
            onClick={() => setShowDrawer(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-300 bg-black/30 hover:bg-black/50 hover:text-white rounded-full transition-all backdrop-blur-sm border border-white/5"
          >
            <ImageIcon size={16} />
            <span>Customize</span>
          </button>

          <Link
            to="/about"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-300 bg-black/30 hover:bg-black/50 hover:text-white rounded-full transition-all backdrop-blur-sm border border-white/5"
          >
            <Settings size={16} />
            <span>Settings</span>
          </Link>

          {/* Dynamic Login/Logout Button */}
          {user ? (
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-red-300 bg-black/30 hover:bg-red-500/20 hover:text-red-200 rounded-full transition-all backdrop-blur-sm border border-white/5"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-300 bg-black/30 hover:bg-black/50 hover:text-white rounded-full transition-all backdrop-blur-sm border border-white/5"
            >
              <LogIn size={16} />
              <span>Login</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Customization Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <CustomizationDrawer
            currentBg={bgImage}
            currentColor={accentColor}
            onSelectBg={handleBgChange}
            onSelectColor={handleColorChange}
            onClose={() => setShowDrawer(false)}
          />
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default Home;
