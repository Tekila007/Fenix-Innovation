/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Services from './pages/Services';
import ServiceCategory from './pages/ServiceCategory';
import Projects from './pages/Projects';
import Promotions from './pages/Promotions';
import About from './pages/About';
import Mensagens from './pages/Mensagens';
import Cart from './pages/Cart';
import Register from './pages/Register';
import Checkout from './pages/Checkout';
import Admin from './pages/Admin';
import UserDashboard from './pages/UserDashboard';
import Profile from './pages/Profile';
import SimplePhoenix from './components/SimplePhoenix';
import ChatBot from './components/ChatBot';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <AnimatePresence mode="wait">
              {showSplash ? (
                <motion.div
                  key="splash"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="fixed inset-0 z-[999] bg-black flex items-center justify-center p-4"
                >
                  <SimplePhoenix />
                </motion.div>
              ) : (
                <motion.div
                  key="app"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Router>
                    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
                      <Toaster position="top-right" toastOptions={{
                        className: 'dark:bg-gray-800 dark:text-white',
                        style: {
                          borderRadius: '10px',
                          background: '#333',
                          color: '#fff',
                        },
                      }} />
                      <Navbar />
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/servicos" element={<Services />} />
                        <Route path="/servicos/:categoryId" element={<ServiceCategory />} />
                        <Route path="/projetos" element={<Projects />} />
                        <Route path="/promocao" element={<Promotions />} />
                        <Route path="/sobre" element={<About />} />
                        <Route path="/mensagens" element={<Mensagens />} />
                        <Route path="/carrinho" element={<Cart />} />
                        <Route path="/cadastro" element={<Register />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/meus-pedidos" element={<UserDashboard />} />
                        <Route path="/perfil" element={<Profile />} />
                        <Route path="/admin" element={<Admin />} />
                      </Routes>
                      <ChatBot />
                      <Footer />
                    </div>
                  </Router>
                </motion.div>
              )}
            </AnimatePresence>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}
