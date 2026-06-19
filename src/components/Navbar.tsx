import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { ShoppingCart, Sun, Moon, Menu, X, LogOut, User, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import NotificationsDropdown from './NotificationsDropdown';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantidade, 0);

  const navLinks = [
    { name: 'Início', path: '/' },
    { name: 'Serviços', path: '/servicos' },
    { name: 'Projetos', path: '/projetos' },
    { name: 'Promoção', path: '/promocao' },
    { name: 'Sobre Nós', path: '/sobre' },
    { name: 'Mensagens', path: '/mensagens' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-11 h-11 flex items-center justify-center bg-gray-950 dark:bg-black rounded-xl overflow-hidden border border-orange-500/20 shadow-md group-hover:border-orange-500/50 transition-all duration-300">
              <img
                src="/uploads/projects/LOGO.png"
                alt="Fênix Logo"
                className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-orange-500 select-none">FX</span>
            </div>
            <span className="text-2xl font-black bg-gradient-to-r from-[#fec24e] to-[#FF8C00] bg-clip-text text-transparent tracking-tight">
              Fênix <span className="hidden sm:inline text-gray-900 dark:text-white font-semibold text-lg ml-1">Innovation</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="text-gray-700 dark:text-gray-300 hover:text-[#FF8C00] dark:hover:text-[#fec24e] font-medium transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center space-x-6">
            <motion.button
              whileHover={{ scale: 1.2, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </motion.button>

            <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
              <Link to="/carrinho" className="relative p-2 text-gray-700 dark:text-gray-300 hover:text-[#FF8C00]">
                <ShoppingCart size={24} />
                {cartItemsCount > 0 && (
                  <span className="absolute top-0 right-0 bg-[#FF8C00] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center transform translate-x-1 -translate-y-1">
                    {cartItemsCount}
                  </span>
                )}
              </Link>
            </motion.div>

            {isAuthenticated && <NotificationsDropdown />}

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                {isAdmin ? (
                  <Link to="/admin" className="text-gray-700 dark:text-gray-300 hover:text-[#FF8C00] font-medium transition-colors">
                    Painel Admin
                  </Link>
                ) : (
                  <Link to="/meus-pedidos" className="text-gray-700 dark:text-gray-300 hover:text-[#FF8C00] font-medium transition-colors">
                    Meus Pedidos
                  </Link>
                )}
                <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                  <Link to="/perfil" className="text-gray-700 dark:text-gray-300 hover:text-[#FF8C00] font-medium transition-colors" title="Meu Perfil">
                    <User size={20} />
                  </Link>
                </motion.div>
                <motion.button 
                  whileHover={{ scale: 1.2, color: '#ef4444' }} 
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLogout} 
                  className="flex items-center gap-2 text-gray-700 dark:text-gray-300 transition-colors" 
                  title="Sair"
                >
                  <LogOut size={20} />
                </motion.button>
              </div>
            ) : (
              <Link
                to="/cadastro"
                className="bg-gradient-to-r from-[#fec24e] to-[#FF8C00] text-white px-6 py-2.5 rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Cadastrar-se
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            <Link to="/carrinho" className="relative p-2 text-gray-700 dark:text-gray-300">
              <ShoppingCart size={24} />
              {cartItemsCount > 0 && (
                <span className="absolute top-0 right-0 bg-[#FF8C00] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center transform translate-x-1 -translate-y-1">
                  {cartItemsCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 dark:text-gray-300"
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[80%] max-w-sm bg-white dark:bg-gray-900 shadow-2xl z-50 md:hidden overflow-y-auto"
            >
              <div className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-8">
                  <span className="text-xl font-bold bg-gradient-to-r from-[#fec24e] to-[#FF8C00] bg-clip-text text-transparent">
                    Menu
                  </span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-1 flex-grow">
                  {navLinks.map((link) => (
                    <Link
                      key={link.name}
                      to={link.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block px-4 py-4 text-lg font-medium rounded-2xl transition-all ${
                        location.pathname === link.path
                          ? 'bg-orange-50 dark:bg-orange-900/20 text-[#FF8C00]'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>

                <div className="mt-auto pt-8 border-t dark:border-gray-800 space-y-6">
                  <div className="flex items-center justify-between px-4">
                    <span className="text-sm font-medium text-gray-500">Tema</span>
                    <button
                      onClick={toggleTheme}
                      className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                      <span className="text-sm font-bold">{theme === 'light' ? 'Dark' : 'Light'}</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {isAuthenticated ? (
                      <>
                        {isAdmin ? (
                          <Link
                            to="/admin"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-4 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors"
                          >
                            <Shield size={20} />
                            <span className="font-medium">Painel Admin</span>
                          </Link>
                        ) : (
                          <Link
                            to="/meus-pedidos"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-4 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors"
                          >
                            <ShoppingCart size={20} />
                            <span className="font-medium">Meus Pedidos</span>
                          </Link>
                        )}
                        <Link
                          to="/perfil"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-4 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors"
                        >
                          <User size={20} />
                          <span className="font-medium">Meu Perfil</span>
                        </Link>
                        <button
                          onClick={() => {
                            handleLogout();
                            setIsMobileMenuOpen(false);
                          }}
                          className="flex items-center justify-center gap-2 w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-6 py-4 rounded-2xl font-bold transition-colors"
                        >
                          <LogOut size={20} />
                          Sair
                        </button>
                      </>
                    ) : (
                      <Link
                        to="/cadastro"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center w-full bg-gradient-to-r from-[#fec24e] to-[#FF8C00] text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-orange-500/20"
                      >
                        Cadastrar-se
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
