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
        <div className="space-y-4">
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <h3 className="font-semibold text-blue-300">Background Source</h3>
            <p className="text-sm text-gray-400">Currently set to Unsplash Daily (Static)</p>
          </div>
          
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <h3 className="font-semibold text-blue-300">About this App</h3>
            <p className="text-sm text-gray-400 mt-1">
              This is a custom dashboard built with React + Vite.
              Deploying to GitHub Pages as a user site.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default About