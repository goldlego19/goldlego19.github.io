import {Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Settings } from 'lucide-react'
import GoogleSearch from '../components/searchbar'

const Home = () => {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen text-white overflow-hidden">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transform scale-105"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop')",
          filter: "brightness(0.5) blur(0px)" 
        }}
      />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full px-4 text-center"
      >
        <h1 className="mb-2 text-5xl font-bold tracking-tight text-white drop-shadow-2xl">
          Good Morning
        </h1>
        <p className="mb-8 text-xl text-gray-200 font-light tracking-wide">
          Stay focused and keep moving forward.
        </p>
        
        <GoogleSearch />

        <div className="mt-16">
          <Link 
            to="/about" 
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-300 bg-black/20 hover:bg-black/40 hover:text-white rounded-full transition-all backdrop-blur-sm"
          >
            <Settings size={16} />
            <span>Settings</span>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

export default Home