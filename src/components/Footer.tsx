import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Linkedin, Mail, Phone, MapPin, User, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import TermsModal from './TermsModal';

const Footer = () => {
  const { isAdmin } = useAuth();
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pt-16 pb-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Company Info */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-6">
              <span className="text-2xl font-bold bg-gradient-to-r from-[#fec24e] to-[#FF8C00] bg-clip-text text-transparent">
                Fênix Innovation
              </span>
            </Link>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Transformando ideias em resultados extraordinários. Somos uma agência criativa focada em design, marketing e tecnologia.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-[#FF8C00] transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#FF8C00] transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#FF8C00] transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#FF8C00] transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Links Rápidos</h3>
            <ul className="space-y-4">
              <li>
                <Link to="/sobre" className="text-gray-600 dark:text-gray-400 hover:text-[#FF8C00] transition-colors">Sobre Nós</Link>
              </li>
              <li>
                <Link to="/servicos" className="text-gray-600 dark:text-gray-400 hover:text-[#FF8C00] transition-colors">Nossos Serviços</Link>
              </li>
              <li>
                <Link to="/projetos" className="text-gray-600 dark:text-gray-400 hover:text-[#FF8C00] transition-colors">Portfólio</Link>
              </li>
              <li>
                <Link to="/promocao" className="text-gray-600 dark:text-gray-400 hover:text-[#FF8C00] transition-colors">Promoções</Link>
              </li>
              <li>
                <Link to="/contato" className="text-gray-600 dark:text-gray-400 hover:text-[#FF8C00] transition-colors">Contato</Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Serviços</h3>
            <ul className="space-y-4">
              <li>
                <Link to="/servicos/redes-sociais" className="text-gray-600 dark:text-gray-400 hover:text-[#FF8C00] transition-colors">Design para Redes Sociais</Link>
              </li>
              <li>
                <Link to="/servicos/impressao" className="text-gray-600 dark:text-gray-400 hover:text-[#FF8C00] transition-colors">Design para Impressão</Link>
              </li>
              <li>
                <Link to="/servicos/motion-design" className="text-gray-600 dark:text-gray-400 hover:text-[#FF8C00] transition-colors">Motion Design</Link>
              </li>
              <li>
                <Link to="/servicos/web-design" className="text-gray-600 dark:text-gray-400 hover:text-[#FF8C00] transition-colors">Web Design</Link>
              </li>
              <li>
                <Link to="/servicos/direcao-de-arte" className="text-gray-600 dark:text-gray-400 hover:text-[#FF8C00] transition-colors">Direção de Arte</Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Contato</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <MapPin className="w-5 h-5 text-[#FF8C00] mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400">Luanda, Angola</span>
              </li>
              <li className="flex items-center">
                <a href="tel:+244945456835" className="flex items-center text-gray-600 dark:text-gray-400 hover:text-[#FF8C00] transition-colors">
                  <Phone className="w-5 h-5 text-[#FF8C00] mr-3 flex-shrink-0" />
                  <span>Chamadas: +244 945 456 835</span>
                </a>
              </li>
              <li className="flex items-center">
                <a href="https://wa.me/244952368856" target="_blank" rel="noopener noreferrer" className="flex items-center text-gray-600 dark:text-gray-400 hover:text-[#FF8C00] transition-colors">
                  <MessageSquare className="w-5 h-5 text-[#FF8C00] mr-3 flex-shrink-0" />
                  <span>WhatsApp: +244 952 368 856</span>
                </a>
              </li>
              <li className="flex items-center">
                <Mail className="w-5 h-5 text-[#FF8C00] mr-3 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400">fenixinn12@gmail.com</span>
              </li>
              {isAdmin && (
                <li className="pt-4">
                  <Link 
                    to="/admin" 
                    className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <User size={18} />
                    Painel
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} Fênix Innovation. Todos os direitos reservados.
          </p>
          <div className="flex space-x-6 text-sm">
            <button 
              onClick={() => setIsTermsModalOpen(true)} 
              className="text-gray-500 dark:text-gray-400 hover:text-[#FF8C00] transition-colors"
            >
              Termos de Serviço
            </button>
            <button 
              onClick={() => setIsTermsModalOpen(true)} 
              className="text-gray-500 dark:text-gray-400 hover:text-[#FF8C00] transition-colors"
            >
              Política de Privacidade
            </button>
          </div>
        </div>
      </div>
      <TermsModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} />
    </footer>
  );
};

export default Footer;
