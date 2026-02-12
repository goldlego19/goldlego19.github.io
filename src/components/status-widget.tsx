import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Power,
  Loader2,
  Activity,
  Smartphone,
  Server,
  Cpu,
  Laptop,
} from "lucide-react";
import { db, auth } from "../firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { type AccentColor } from "./timetable";

// --- THEME CONFIGURATION ---
const themeConfig: Record<
  AccentColor,
  {
    text: string;
    iconBg: string;
    iconText: string;
  }
> = {
  blue: {
    text: "text-blue-200",
    iconBg: "bg-blue-500/10",
    iconText: "text-blue-400",
  },
  green: {
    text: "text-emerald-200",
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-400",
  },
  purple: {
    text: "text-violet-200",
    iconBg: "bg-violet-500/10",
    iconText: "text-violet-400",
  },
  orange: {
    text: "text-amber-200",
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-400",
  },
  pink: {
    text: "text-rose-200",
    iconBg: "bg-rose-500/10",
    iconText: "text-rose-400",
  },
  red: {
    text: "text-red-200",
    iconBg: "bg-red-500/10",
    iconText: "text-red-400",
  },
};

const getDeviceIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("phone")) return <Smartphone size={18} />;
  if (n.includes("server") || n.includes("pi")) return <Server size={18} />;
  if (n.includes("node") || n.includes("chip")) return <Cpu size={18} />;
  if (n.includes("laptop")) return <Laptop size={18} />;
  return <Monitor size={18} />;
};

const StatusWidget = ({
  accentColor = "blue",
}: {
  accentColor?: AccentColor;
}) => {
  const theme = themeConfig[accentColor];
  const [devices, setDevices] = useState<any[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [wakingId, setWakingId] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    const q = query(collection(db, "devices"));
    const unsub = onSnapshot(q, (snapshot) => {
      const deviceList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDevices(deviceList);
    });
    return () => unsub();
  }, []);

  const handleWake = async (deviceId: string) => {
    setWakingId(deviceId);
    const endpoint = deviceId === "home-pc" ? "wakeMain" : "wakeServer";
    try {
      // Replace with your actual external IP or domain
      await fetch(`http://213.217.201.0:5000/${endpoint}?key=denzel11`);
    } catch (e) {
      console.error("WoL failed", e);
    } finally {
      setTimeout(() => setWakingId(null), 5000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <div className={`flex items-center gap-2 ${theme.text}`}>
          <Activity size={20} />
          <span className="font-semibold tracking-wide">System Status</span>
        </div>
        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
          {devices.length} Devices
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {devices.map((device) => {
            // 1. Check strict status from DB
            const isOnline = device.status === "active";

            // 2. Safety Check: If data is stale (> 2 mins), mark offline
            const lastSeenDate = device.lastSeen?.toDate
              ? device.lastSeen.toDate()
              : new Date(device.lastSeen);

            const diffSeconds =
              (new Date().getTime() - lastSeenDate.getTime()) / 1000;
            const isTrulyOnline = isOnline && diffSeconds < 120;

            return (
              <motion.div
                key={device.id}
                layout
                className="group flex flex-col p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-center justify-between gap-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${theme.iconBg} ${theme.iconText}`}
                    >
                      {getDeviceIcon(device.id)}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-100 capitalize">
                        {device.id.replace("-", " ")}
                      </h3>
                      <p className="text-[10px] text-gray-500 font-mono">
                        {isTrulyOnline ? "Last Seen:" : "Offline Since:"}{" "}
                        {lastSeenDate.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${
                        isTrulyOnline
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-red-500/10 border-red-500/20 text-red-400"
                      }`}
                    >
                      <div
                        className={`w-1 h-1 rounded-full ${isTrulyOnline ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`}
                      />
                      {isTrulyOnline ? "Online" : "Offline"}
                    </div>

                    {/* Boot Button (Only if User is Logged In & Device is Offline) */}
                    {user && !isTrulyOnline && (
                      <button
                        onClick={() => handleWake(device.id)}
                        disabled={wakingId === device.id}
                        className="p-2 bg-white/10 hover:bg-white text-white hover:text-black rounded-lg transition-all disabled:opacity-50"
                        title="Boot Device"
                      >
                        {wakingId === device.id ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <Power size={14} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default StatusWidget;
