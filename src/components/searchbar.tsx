import { useState } from 'react'
import { Search } from 'lucide-react'

const GoogleSearch = () => {
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query) return
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`
  }

  return (
    <form onSubmit={handleSearch} className="w-full max-w-md mx-auto mt-10">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          {/* Lucide Search Icon */}
          <Search className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input 
          type="text" 
          className="block w-full p-4 pl-12 text-sm text-gray-900 border border-transparent rounded-full bg-white/90 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 shadow-xl outline-none transition-all duration-300 focus:scale-105" 
          placeholder="Search Google..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button 
          type="submit" 
          className="absolute right-2.5 bottom-2.5 bg-blue-600 hover:bg-blue-700 text-white focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-4 py-2 transition-transform active:scale-95"
        >
          Go
        </button>
      </div>
    </form>
  )
}

export default GoogleSearch