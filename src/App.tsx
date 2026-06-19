import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import MeasureEntry from "@/pages/MeasureEntry"
import MeasureDetail from "@/pages/MeasureDetail"
import Review from "@/pages/Review"
import Remeasure from "@/pages/Remeasure"
import Publish from "@/pages/Publish"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/measure/new" element={<MeasureEntry />} />
          <Route path="/measure/edit/:id" element={<MeasureEntry />} />
          <Route path="/measure/:id" element={<MeasureDetail />} />
          <Route path="/review" element={<Review />} />
          <Route path="/remeasure" element={<Remeasure />} />
          <Route path="/remeasure/:id" element={<Remeasure />} />
          <Route path="/publish" element={<Publish />} />
        </Route>
      </Routes>
    </Router>
  )
}
