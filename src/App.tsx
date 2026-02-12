import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
// import './App.css' // You can likely remove this import if you aren't using default styles anymore

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
    </Routes>
  )
}

export default App