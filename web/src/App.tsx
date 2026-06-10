import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import BanList from "./pages/BanList";
import FoodDetail from "./pages/FoodDetail";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Compare from "./pages/Compare";
import MoleculeDetail from "./pages/MoleculeDetail";
import Research from "./pages/Research";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/foods/:id" element={<FoodDetail />} />
        <Route path="/molecules/:id" element={<MoleculeDetail />} />
        <Route path="/research" element={<Research />} />
        <Route path="/ban-list" element={<BanList />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
