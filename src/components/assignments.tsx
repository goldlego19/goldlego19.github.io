import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  X,
  GraduationCap,
  Save,
  Clock,
  AlertCircle,
  MapPin,
  ListFilter,
  Pencil,
  HelpCircle
} from "lucide-react";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
} from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { type AccentColor } from "./timetable";

type TaskType = "Assignment" | "Exam" | "TBA";

interface Task {
  id: string;
  title: string;
  dueDate?: string; // Optional Date
  type: TaskType;
  time?: string;
  room?: string;
}

// --- HELPERS ---
const getOrdinalSuffix = (i: number) => {
  const j = i % 10, k = i % 100;
  if (j === 1 && k !== 11) return i + "st";
  if (j === 2 && k !== 12) return i + "nd";
  if (j === 3 && k !== 13) return i + "rd";
  return i + "th";
};

const formatUKDate = (dateStr?: string) => {
  if (!dateStr) return "Date TBD";
  const d = new Date(dateStr);
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset()); 
  
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  const day = d.getDate();
  const month = d.toLocaleDateString("en-GB", { month: "long" });
  
  return `${weekday} ${day}${getOrdinalSuffix(day)} ${month}`;
};

const calculateDaysRemaining = (dateStr?: string) => {
  if (!dateStr) return null; // Return null for tasks without a date
  const due = new Date(dateStr);
  due.setMinutes(due.getMinutes() + due.getTimezoneOffset());
  due.setHours(23, 59, 59, 999); 

  const today = new Date();
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// --- REUSABLE TASK CARD COMPONENT ---
const TaskCard = ({ task, theme, user, onEdit, onDelete }: { task: Task, theme: any, user: User | null, onEdit: (t: Task) => void, onDelete: (id: string) => void }) => {
  const daysLeft = calculateDaysRemaining(task.dueDate);
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
  const isOverdue = daysLeft !== null && daysLeft < 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group relative p-4 rounded-xl border transition-all ${
        isUrgent ? 'bg-red-500/10 border-red-500/30 ring-1 ring-red-500/20' 
        : isOverdue ? 'bg-white/5 border-transparent opacity-50'
        : 'bg-white/5 border-white/5 hover:border-white/20'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-12"> {/* Added more right padding for absolute buttons */}
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-semibold text-lg ${isUrgent ? 'text-red-100' : 'text-white'}`}>
              {task.title}
            </h4>
            {isUrgent && <AlertCircle size={14} className="text-red-400" />}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mb-3">
            <div className="flex items-center gap-1.5">
              <CalendarIcon size={12} />
              <span className={!task.dueDate ? "italic opacity-70" : ""}>
                {formatUKDate(task.dueDate)}
              </span>
            </div>
            
            {task.time && (
              <div className="flex items-center gap-1.5 text-gray-300">
                <span className="text-white/20">•</span>
                <Clock size={12} />
                <span>{task.time}</span>
              </div>
            )}
            
            {task.room && (
              <div className="flex items-center gap-1.5 text-gray-300">
                <span className="text-white/20">•</span>
                <MapPin size={12} />
                <span>{task.room}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
              task.type === 'Exam' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/20' 
              : task.type === 'TBA' ? 'bg-gray-500/20 text-gray-300 border border-gray-500/20'
              : 'bg-blue-500/20 text-blue-300 border border-blue-500/20'
            }`}>
              {task.type === 'Exam' ? <GraduationCap size={10} /> : task.type === 'TBA' ? <HelpCircle size={10} /> : <BookOpen size={10} />}
              {task.type}
            </span>
            
            <span className={`text-xs font-medium flex items-center gap-1 ${
              isOverdue ? 'text-gray-500' 
              : isUrgent ? 'text-red-400' 
              : theme.text
            }`}>
              <Clock size={12} />
              {daysLeft === null ? 'No Date Set' : isOverdue ? 'Passed' : daysLeft === 0 ? 'Due Today' : daysLeft === 1 ? '1 Day Remaining' : `${daysLeft} Days Remaining`}
            </span>
          </div>
        </div>

        {/* Action Buttons Container */}
        {user && (
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(task)}
              className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
              title="Edit Task"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
              title="Delete Task"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// --- SHOW ALL MODAL ---
const ShowAllModal = ({ isOpen, onClose, tasks, theme, user, onEdit, onDelete }: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative z-10 w-full max-w-2xl bg-gray-900/95 border border-white/10 p-6 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col max-h-[85vh]"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ListFilter size={20} className={theme.text} />
            All Upcoming Deadlines
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 pb-4">
          {tasks.map((task: Task) => (
            <TaskCard key={task.id} task={task} theme={theme} user={user} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// --- UNIVERSAL TASK MODAL (ADD / EDIT) ---
const TaskModal = ({ isOpen, onClose, theme, user, existingTask }: any) => {
  const [taskData, setTaskData] = useState({ 
    title: existingTask?.title || "", 
    dueDate: existingTask?.dueDate || "", 
    time: existingTask?.time || "", 
    room: existingTask?.room || "", 
    type: (existingTask?.type || "Assignment") as TaskType 
  });

  const isEditing = !!existingTask;

  const handleSave = async () => {
    if (!taskData.title || !user) return; // Title is still required
    try {
      if (isEditing) {
        await updateDoc(doc(db, "assignments", existingTask.id), {
          ...taskData,
        });
      } else {
        await addDoc(collection(db, "assignments"), {
          ...taskData,
          createdAt: new Date(),
        });
      }
      onClose();
    } catch (e) {
      console.error("Error saving task: ", e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative z-10 w-full max-w-md bg-gray-900 border border-white/10 p-6 rounded-2xl shadow-2xl backdrop-blur-xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            {isEditing ? <Pencil className={theme.text} size={22} /> : <Plus className={theme.text} size={24} />}
            {isEditing ? "Edit Task" : "Add New Deadline"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">Title *</label>
            <input
              placeholder="e.g. Home Assignment"
              value={taskData.title}
              onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
              className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none ${theme.border}`}
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">Due Date (Optional)</label>
            <input
              type="date"
              value={taskData.dueDate}
              onChange={(e) => setTaskData({ ...taskData, dueDate: e.target.value })}
              className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none ${theme.border} [color-scheme:dark]`}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">Time (Opt)</label>
              <input
                type="time"
                value={taskData.time}
                onChange={(e) => setTaskData({ ...taskData, time: e.target.value })}
                className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none ${theme.border} [color-scheme:dark]`}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">Room (Opt)</label>
              <input
                placeholder="e.g. Hall A"
                value={taskData.room}
                onChange={(e) => setTaskData({ ...taskData, room: e.target.value })}
                className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none ${theme.border}`}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">Type</label>
            <div className="flex gap-2 text-sm">
              {(["Assignment", "Exam", "TBA"] as TaskType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setTaskData({ ...taskData, type })}
                  className={`flex-1 py-2 rounded-lg border font-medium transition-all ${
                    taskData.type === type ? `${theme.bg} ${theme.border} ${theme.text} border-opacity-50 ring-1 ring-white/10` : "bg-black/50 border-white/10 text-gray-400 hover:bg-white/5"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-colors">Cancel</button>
            <button 
              onClick={handleSave} 
              disabled={!taskData.title}
              className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 ${theme.primary} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Save size={18} /> {isEditing ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- MAIN WIDGET ---
const AssignmentsWidget = ({ accentColor = "blue" }: { accentColor?: AccentColor }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  // Modal states
  const [showAll, setShowAll] = useState(false);
  const [modalState, setModalState] = useState<{isOpen: boolean, taskToEdit: Task | null}>({ isOpen: false, taskToEdit: null });

  const themeColors = {
    blue: { primary: "bg-blue-500", bg: "bg-blue-500/20", text: "text-blue-400", border: "focus:border-blue-500" },
    green: { primary: "bg-emerald-500", bg: "bg-emerald-500/20", text: "text-emerald-400", border: "focus:border-emerald-500" },
    purple: { primary: "bg-violet-500", bg: "bg-violet-500/20", text: "text-violet-400", border: "focus:border-violet-500" },
    orange: { primary: "bg-amber-500", bg: "bg-amber-500/20", text: "text-amber-400", border: "focus:border-amber-500" },
    pink: { primary: "bg-rose-500", bg: "bg-rose-500/20", text: "text-rose-400", border: "focus:border-rose-500" },
    red: { primary: "bg-red-500", bg: "bg-red-500/20", text: "text-red-400", border: "focus:border-red-500" },
  };
  const theme = themeColors[accentColor] || themeColors.blue;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "assignments"));
    const unsub = onSnapshot(q, (snapshot) => {
      const fetched: Task[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      
      // Sort logic: Closest date first. Tasks with NO date go to the bottom.
      fetched.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      
      // Filter out tasks older than 1 day (Keep tasks with no date)
      const activeTasks = fetched.filter(t => !t.dueDate || calculateDaysRemaining(t.dueDate)! >= -1);
      setTasks(activeTasks);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (confirm("Delete this deadline?")) {
      await deleteDoc(doc(db, "assignments", id));
    }
  };

  const openAddModal = () => setModalState({ isOpen: true, taskToEdit: null });
  const openEditModal = (task: Task) => setModalState({ isOpen: true, taskToEdit: task });
  const closeTaskModal = () => setModalState({ isOpen: false, taskToEdit: null });

  const displayedTasks = tasks.slice(0, 3);
  const hasMore = tasks.length > 3;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col h-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${theme.bg}`}>
              <BookOpen size={16} className={theme.text} />
            </div>
            <span className={`text-sm font-semibold tracking-wide ${theme.text}`}>Deadlines</span>
          </div>
          
          {!isAuthLoading && user && (
            <button
              onClick={openAddModal}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              title="Add Deadline"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        {/* List (Max 3 Items) */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {displayedTasks.length > 0 ? (
              displayedTasks.map((task) => (
                <TaskCard key={task.id} task={task} theme={theme} user={user} onEdit={openEditModal} onDelete={handleDelete} />
              ))
            ) : (
              <div className="text-center py-6 text-gray-500 italic flex flex-col items-center gap-2">
                <BookOpen size={24} className="opacity-20" />
                No upcoming deadlines.
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Show All Button */}
        {hasMore && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-4 w-full py-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-sm font-medium text-gray-300 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <ListFilter size={14} />
            Show all {tasks.length} deadlines
          </button>
        )}
      </motion.div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {modalState.isOpen && (
          <TaskModal
            isOpen={modalState.isOpen}
            onClose={closeTaskModal}
            theme={theme}
            user={user}
            existingTask={modalState.taskToEdit}
          />
        )}
        
        {showAll && (
          <ShowAllModal
            isOpen={showAll}
            onClose={() => setShowAll(false)}
            tasks={tasks}
            theme={theme}
            user={user}
            onEdit={openEditModal}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default AssignmentsWidget;