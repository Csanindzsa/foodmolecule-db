import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import FoodDetail from "./pages/FoodDetail";
import Home from "./pages/Home";
import Search from "./pages/Search";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/foods/:id" element={<FoodDetail />} />
      </Route>
    </Routes>
  );
}
