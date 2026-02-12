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

const Home = () => {
  const [bg, setBg] = useState(
    () => localStorage.getItem("wallpaper") || allBackgrounds[0],
  );
  const [accent, setAccent] = useState<AccentColor>(
    () => (localStorage.getItem("themeColor") as AccentColor) || "blue",
  );
  const [drawer, setDrawer] = useState(false);
  const [login, setLogin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [greet, setGreet] = useState("");

  useEffect(() => {
    onAuthStateChanged(auth, setUser);
    const h = new Date().getHours();
    setGreet(
      h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening",
    );
  }, []);

  return (
    <div className="relative flex flex-col items-center min-h-screen text-white overflow-hidden font-sans">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bg}')`, filter: "brightness(0.5)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full mx-auto px-4 flex flex-col items-center pt-20 pb-10 overflow-y-auto h-full scrollbar-hide"
      >
        <h1 className="mb-2 text-6xl font-bold tracking-tight text-white drop-shadow-2xl text-center">
          {greet}
        </h1>
        <p className="mb-12 text-xl text-gray-200 font-light tracking-wide text-center">
          Stay focused.
        </p>
        <GoogleSearch />

        {/* --- FIXED LAYOUT --- */}
        <div className="mt-12 w-full flex flex-col xl:flex-row justify-center items-center gap-8">
          <div className="max-w-2xl">
            <StatusWidget accentColor={accent} />
          </div>
          <TimetableWidget accentColor={accent} />
          <div className="w-[15%]">
            <BookmarksWidget accentColor={accent} />
          </div>
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-4 pb-10">
          <button
            onClick={() => setDrawer(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-300 bg-black/30 hover:bg-black/50 hover:text-white rounded-full backdrop-blur-sm border border-white/5"
          >
            <ImageIcon size={16} />
            <span>Customize</span>
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
    </div>
  );
};
export default Home;
