import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
    </Routes>
  )
}

export default App