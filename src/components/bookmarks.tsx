import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link as LinkIcon,
  ExternalLink,
  Bookmark,
  Plus,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { type AccentColor } from "./timetable";

// --- THEME CONFIG ---
const themeConfig: Record<
  AccentColor,
  { hover: string; icon: string; button: string }
> = {
  blue: {
    hover: "group-hover:border-blue-500/50",
    icon: "text-blue-400",
    button: "bg-blue-500 hover:bg-blue-400",
  },
  green: {
    hover: "group-hover:border-emerald-500/50",
    icon: "text-emerald-400",
    button: "bg-emerald-500 hover:bg-emerald-400",
  },
  purple: {
    hover: "group-hover:border-violet-500/50",
    icon: "text-violet-400",
    button: "bg-violet-500 hover:bg-violet-400",
  },
  orange: {
    hover: "group-hover:border-amber-500/50",
    icon: "text-amber-400",
    button: "bg-amber-500 hover:bg-amber-400",
  },
  pink: {
    hover: "group-hover:border-rose-500/50",
    icon: "text-rose-400",
    button: "bg-rose-500 hover:bg-rose-400",
  },
  red: {
    hover: "group-hover:border-red-500/50",
    icon: "text-red-400",
    button: "bg-red-500 hover:bg-red-400",
  },
};

const BookmarksWidget = ({
  accentColor = "blue",
}: {
  accentColor?: AccentColor;
}) => {
  const theme = themeConfig[accentColor];

  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", url: "" });
  const [loading, setLoading] = useState(false);

  // 1. Listen for Auth (To show Admin Controls)
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  // 2. Listen for Realtime Bookmarks
  useEffect(() => {
    // Order by creation time so they don't jump around
    const q = query(collection(db, "bookmarks"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setBookmarks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // 3. Add Bookmark Logic
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.url) return;
    setLoading(true);

    try {
      // Auto-prefix URL if missing http
      let finalUrl = newItem.url;
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = "https://" + finalUrl;
      }

      await addDoc(collection(db, "bookmarks"), {
        name: newItem.name,
        url: finalUrl,
        createdAt: serverTimestamp(),
      });
      setNewItem({ name: "", url: "" });
      setIsAdding(false);
    } catch (err) {
      console.error("Error adding bookmark:", err);
    } finally {
      setLoading(false);
    }
  };

  // 4. Delete Logic
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); // Stop the link from clicking
    e.stopPropagation();
    if (window.confirm("Remove this bookmark?")) {
      await deleteDoc(doc(db, "bookmarks", id));
    }
  };

  // Helper to get Google's Favicon Service
  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch (e) {
      return "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full h-full min-h-[300px] bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 text-gray-200">
          <Bookmark size={20} className={theme.icon} />
          <span className="font-semibold tracking-wide">Quick Links</span>
        </div>

        {/* Only show Add button if Logged In */}
        {user ? (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className={`p-1.5 rounded-lg transition-colors ${isAdding ? "bg-red-500/20 text-red-400" : "hover:bg-white/10 text-gray-400 hover:text-white"}`}
          >
            {isAdding ? <X size={16} /> : <Plus size={16} />}
          </button>
        ) : (
          <ExternalLink size={14} className="text-gray-500" />
        )}
      </div>

      {/* Add Form (Visible only when adding) */}
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
              placeholder="Name (e.g. GitHub)"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            />
            <input
              type="text"
              placeholder="URL (e.g. github.com)"
              value={newItem.url}
              onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            />
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 rounded-lg text-xs font-bold text-white transition-all flex justify-center ${theme.button}`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                "Save Link"
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
        {/* RESPONSIVE GRID FIX */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-2 gap-3 pb-2">
          <AnimatePresence>
            {bookmarks.map((link) => (
              <motion.a
                key={link.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative flex flex-col items-center justify-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 transition-all duration-300 hover:bg-white/10 ${theme.hover}`}
              >
                {/* Delete Button (Only for Admin) */}
                {user && (
                  <button
                    onClick={(e) => handleDelete(link.id, e)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all scale-75 hover:scale-100"
                  >
                    <Trash2 size={12} />
                  </button>
                )}

                <div className="relative w-10 h-10 bg-white/10 rounded-full flex items-center justify-center overflow-hidden shadow-lg group-hover:scale-110 transition-transform">
                  {/* Favicon */}
                  <img
                    src={getFavicon(link.url)}
                    alt={link.name}
                    className="w-6 h-6 object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <LinkIcon
                    size={18}
                    className="absolute text-gray-500 opacity-0 -z-10"
                  />
                </div>

                <span className="text-xs font-medium text-gray-300 group-hover:text-white tracking-wide truncate w-full text-center">
                  {link.name}
                </span>
              </motion.a>
            ))}
          </AnimatePresence>

          {bookmarks.length === 0 && !isAdding && (
            <div className="col-span-2 py-8 text-center text-gray-500 text-xs italic">
              No links yet. <br /> Log in to add some!
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BookmarksWidget;