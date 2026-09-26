import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Stays from './pages/Stays';
import HotelDetails from './pages/HotelDetails';
import Checkout from './pages/Checkout';
import About from './pages/About';
import Contact from './pages/Contact';
import SignIn from './pages/SignIn';

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stays" element={<Stays />} />
          <Route path="/stays/:slug" element={<HotelDetails />} />
          <Route path="/checkout/:slug" element={<Checkout />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
