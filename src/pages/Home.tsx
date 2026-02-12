import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Image as ImageIcon, X } from 'lucide-react'
import GoogleSearch from '../components/searchbar' // <--- Imported here

// --- Background Loading Logic ---
const bgModules = import.meta.glob('../assets/backgrounds/*.{png,jpg,jpeg,webp}', { eager: true })

const localBackgrounds = Object.values(bgModules).map((mod: any) => mod.default)
const defaultBg = "https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop"
const allBackgrounds = localBackgrounds.length > 0 ? localBackgrounds : [defaultBg]

// --- Local Component: Background Selector ---
// (You could move this to src/components/BackgroundSelector.tsx later if you want)
const BackgroundSelector = ({ currentBg, onSelect, onClose }: { currentBg: string, onSelect: (url: string) => void, onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-x-0 bottom-0 z-50 bg-gray-900/95 backdrop-blur-xl border-t border-gray-700 p-6 shadow-2xl"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <ImageIcon size={18} /> Select Wallpaper
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {allBackgrounds.map((bg, index) => (
            <button 
              key={index}
              onClick={() => onSelect(bg)}
              className={`relative flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border-2 transition-all ${currentBg === bg ? 'border-blue-500 scale-105' : 'border-transparent hover:border-gray-500'}`}
            >
              <img src={bg} alt="bg" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// --- Main Page Component ---
const Home = () => {
  const [bgImage, setBgImage] = useState(() => localStorage.getItem('wallpaper') || allBackgrounds[0])
  const [showBgSelector, setShowBgSelector] = useState(false)

  const handleBgChange = (newUrl: string) => {
    setBgImage(newUrl)
    localStorage.setItem('wallpaper', newUrl)
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen text-white overflow-hidden">
      
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out"
        style={{ 
          backgroundImage: `url('${bgImage}')`,
          filter: "brightness(0.6)" 
        }}
      />

      {/* Content Layer */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full px-4 text-center"
      >
        <h1 className="mb-2 text-6xl font-bold tracking-tight text-white drop-shadow-2xl">
          Good Morning
        </h1>
        <p className="mb-8 text-xl text-gray-200 font-light tracking-wide">
          Stay focused.
        </p>
        
        <GoogleSearch />

        <div className="mt-16 flex justify-center gap-4">
          <button 
            onClick={() => setShowBgSelector(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-300 bg-black/30 hover:bg-black/50 hover:text-white rounded-full transition-all backdrop-blur-sm"
          >
            <ImageIcon size={16} />
            <span>Customize</span>
          </button>

          <Link 
            to="/about" 
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-300 bg-black/30 hover:bg-black/50 hover:text-white rounded-full transition-all backdrop-blur-sm"
          >
            <Settings size={16} />
            <span>Settings</span>
          </Link>
        </div>
      </motion.div>

      {/* Background Selector Drawer */}
      <AnimatePresence>
        {showBgSelector && (
          <BackgroundSelector 
            currentBg={bgImage} 
            onSelect={handleBgChange} 
            onClose={() => setShowBgSelector(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default Home