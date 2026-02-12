import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

const About = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="max-w-lg w-full bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700"
      >
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors mb-6 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
        
        <h2 className="text-3xl font-bold mb-4">Settings</h2>
        <div className="space-y-4 text-gray-400">
           <p>This is your personal dashboard.</p>
           <div className="p-4 bg-gray-700/50 rounded-lg">
             <h3 className="font-semibold text-blue-300">Tips</h3>
             <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                 <li>Click "Customize" on the home screen to change the wallpaper.</li>
                 <li>Your wallpaper choice is saved automatically.</li>
             </ul>
           </div>
           <p className="text-xs uppercase tracking-widest text-gray-500 mt-8">Version 1.0.0</p>
        </div>
      </motion.div>
    </div>
  )
}

export default About