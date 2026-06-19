import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Service, formatAOA } from '../contexts/CartContext';
import { motion } from 'motion/react';
import { Tag, ArrowRight } from 'lucide-react';

interface PromoService extends Service {
  oldPrice?: number;
}

const Promotions = () => {
  const [promotions, setPromotions] = useState<PromoService[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await axios.get('/api/services');
        const allServices = res.data;
        const promoServices = allServices.filter((s: Service) => s.is_promo).map((s: Service) => ({
          ...s,
          oldPrice: s.preco * 1.2 // 20% discount simulation for display
        }));
        setPromotions(promoServices);
      } catch (error) {
        console.error('Erro ao buscar serviços:', error);
      }
    };
    fetchServices();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 pt-24 pb-20 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold mb-4 flex items-center justify-center gap-4"
          >
            <Tag className="w-10 h-10 text-[#FF8C00]" />
            Nossas <span className="text-[#FF8C00]">Promoções</span>
          </motion.h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Aproveite nossos pacotes com descontos exclusivos por tempo limitado.
          </p>
        </div>

        {promotions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {promotions.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 flex flex-col h-full relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 bg-[#FF8C00] text-white px-4 py-1 rounded-bl-xl font-bold text-sm z-10">
                  OFERTA
                </div>

                <div className="flex-grow">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{service.nome}</h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 mb-4">
                    {service.categoria}
                  </span>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 line-clamp-3">
                    {service.descricao}
                  </p>
                  <div className="mb-8">
                    <span className="text-lg text-gray-400 dark:text-gray-500 line-through mr-3">
                      {formatAOA(service.oldPrice || 0)}
                    </span>
                    <span className="text-4xl font-extrabold text-[#FF8C00]">
                      {formatAOA(service.preco)}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/servicos/${
                    service.categoria === 'Design para Redes Sociais' ? 'redes-sociais' :
                    service.categoria === 'Design para Impressão' ? 'impressao' :
                    service.categoria === 'Motion Design' ? 'motion-design' :
                    service.categoria === 'Web Design' ? 'web-design' :
                    service.categoria === 'Direção de Arte' ? 'direcao-de-arte' : ''
                  }`}
                  className="w-full flex items-center justify-center py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-[#fec24e] to-[#FF8C00] hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300"
                >
                  Aproveitar Oferta <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-10">
            Nenhuma promoção disponível no momento. Fique atento às novidades!
          </div>
        )}
      </div>
    </div>
  );
};

export default Promotions;
