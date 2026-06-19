import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useCart, Service, formatAOA } from '../contexts/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, 
  Check, 
  ArrowLeft,
  ArrowRight,
  Instagram,
  Monitor,
  Play,
  Printer,
  Palette,
  Package,
  Brush,
  FileText,
  X
} from 'lucide-react';

const getServiceIcon = (category: string) => {
  const iconProps = { className: "w-6 h-6 text-[#FF8C00]" };
  let icon;
  switch (category) {
    case 'Design para Redes Sociais':
      icon = <Instagram {...iconProps} />;
      break;
    case 'Web Design':
      icon = <Monitor {...iconProps} />;
      break;
    case 'Motion Design':
      icon = <Play {...iconProps} />;
      break;
    case 'Design para Impressão':
      icon = <Printer {...iconProps} />;
      break;
    case 'Direção de Arte':
      icon = <Palette {...iconProps} />;
      break;
    default:
      icon = <Package {...iconProps} />;
  }
  return (
    <motion.div whileHover={{ scale: 1.2, rotate: 5 }} className="inline-block">
      {icon}
    </motion.div>
  );
};

const categoryDetails: Record<string, { title: string; description: string; benefits: string[]; works: string[] }> = {
  'redes-sociais': {
    title: 'Design para Redes Sociais',
    description: 'Criamos designs impactantes e estratégicos para suas redes sociais, aumentando o engajamento e a conversão do seu público-alvo.',
    benefits: ['Aumento de engajamento', 'Identidade visual consistente', 'Atração de novos seguidores', 'Maior conversão em vendas'],
    works: ['Posts para Instagram e Facebook', 'Capas para Facebook e YouTube', 'Stories animados', 'Templates editáveis', 'Banners promocionais', 'Artes para campanhas pagas (ADS)']
  },
  'impressao': {
    title: 'Design para Impressão',
    description: 'Materiais gráficos de alta qualidade que transmitem profissionalismo e credibilidade para a sua marca no mundo físico.',
    benefits: ['Credibilidade e confiança', 'Destaque em eventos e PDV', 'Materiais palpáveis de alta qualidade', 'Comunicação direta com o cliente'],
    works: ['Flyers', 'Cartazes', 'Outdoors', 'Brochuras', 'Catálogos', 'Embalagens']
  },
  'motion-design': {
    title: 'Motion Design',
    description: 'Animações dinâmicas e envolventes que dão vida à sua marca e explicam seus produtos de forma clara e atrativa.',
    benefits: ['Maior retenção de atenção', 'Explicação clara de produtos/serviços', 'Destaque em anúncios em vídeo', 'Modernização da marca'],
    works: ['Motion gráfico publicitário', 'Animação de logotipo', 'Vídeos promocionais', 'Animação para LED Outdoor', 'Vídeos institucionais', 'Reels animados']
  },
  'web-design': {
    title: 'Web Design',
    description: 'Desenvolvimento de interfaces modernas, responsivas e focadas na experiência do usuário para converter visitantes em clientes.',
    benefits: ['Presença digital profissional', 'Navegação intuitiva (UX/UI)', 'Otimização para conversão', 'Design responsivo (Mobile First)'],
    works: ['Design de sites', 'Landing Pages', 'Interface para aplicativos', 'Layout para e-commerce', 'Protótipos (UI/UX)']
  },
  'direcao-de-arte': {
    title: 'Direção de Arte',
    description: 'Supervisão e criação de conceitos visuais que garantem que toda a comunicação da sua marca seja coesa e impactante.',
    benefits: ['Posicionamento de marca forte', 'Comunicação visual coesa', 'Diferenciação no mercado', 'Estratégia visual de longo prazo'],
    works: ['Conceito criativo', 'Planejamento visual', 'Estratégia de marca', 'Supervisão visual']
  }
};

const ServiceCategory = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [services, setServices] = useState<Service[]>([]);
  const { addToCart } = useCart();
  const [addedItems, setAddedItems] = useState<{ [key: number]: boolean }>({});
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const details = categoryId ? categoryDetails[categoryId] : null;

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await axios.get('/api/services');
        // Filter services by category title
        if (details) {
          const filtered = res.data.filter((s: Service) => s.categoria === details.title);
          setServices(filtered);
        }
      } catch (error) {
        console.error('Erro ao buscar serviços:', error);
      }
    };
    if (details) {
      fetchServices();
    }
  }, [details]);

  const handleAddToCart = (e: React.MouseEvent, service: Service) => {
    e.stopPropagation();
    addToCart(service);
    setAddedItems({ ...addedItems, [service.id]: true });
    setTimeout(() => {
      setAddedItems((prev) => ({ ...prev, [service.id]: false }));
    }, 2000);
  };

  if (!details) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Categoria não encontrada</h2>
          <Link to="/servicos" className="text-[#FF8C00] hover:underline">Voltar para Serviços</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 pt-24 pb-20 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/servicos" className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-[#FF8C00] dark:hover:text-[#FF8C00] mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" /> Voltar para Categorias
        </Link>

        <div className="mb-16">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold mb-6"
          >
            {details.title}
          </motion.h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mb-12">
            {details.description}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <h3 className="text-2xl font-bold mb-6 text-[#FF8C00]">Benefícios</h3>
              <ul className="space-y-4">
                {details.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <h3 className="text-2xl font-bold mb-6 text-[#FF8C00]">Serviços Prestados</h3>
              <ul className="space-y-4">
                {details.works.map((work, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-2 h-2 mt-2 rounded-full bg-[#fec24e] mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{work}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>

        <div className="mt-20">
          <h2 className="text-3xl font-bold mb-10 text-center">Pacotes Disponíveis</h2>
          {services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  onClick={() => setSelectedService(service)}
                  className="bg-white dark:bg-gray-800 rounded-3xl p-10 shadow-sm hover:shadow-2xl hover:shadow-orange-500/10 border border-gray-100 dark:border-gray-700 transition-all duration-500 flex flex-col h-full relative overflow-hidden group cursor-pointer"
                >
                  <div className="flex-grow relative z-20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                          {getServiceIcon(service.categoria)}
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-[#FF8C00] transition-colors">{service.nome}</h3>
                      </div>
                      {service.is_promo && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                          PROMO
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 line-clamp-2 leading-relaxed">
                      {service.descricao}
                    </p>
                    <div className="flex items-center justify-between mb-8">
                      <div className="text-3xl font-black text-gray-900 dark:text-white">
                        {formatAOA(service.preco)}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedService(service);
                        }}
                        className="text-sm font-bold text-[#FF8C00] hover:underline flex items-center gap-1"
                      >
                        Ver Detalhes <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 relative z-20">
                    <button
                      onClick={(e) => handleAddToCart(e, service)}
                      disabled={addedItems[service.id]}
                      className={`w-full flex items-center justify-center py-4 px-6 rounded-2xl font-bold text-white transition-all duration-300 ${
                        addedItems[service.id]
                          ? 'bg-green-500 shadow-lg shadow-green-500/20'
                          : 'bg-gradient-to-r from-[#fec24e] to-[#FF8C00] hover:shadow-xl shadow-orange-500/10 transform hover:-translate-y-1 active:scale-95'
                      }`}
                    >
                      <AnimatePresence mode="wait">
                        {addedItems[service.id] ? (
                          <motion.div
                            key="added"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="flex items-center"
                          >
                            <Check className="w-5 h-5 mr-2" /> Adicionado!
                          </motion.div>
                        ) : (
                          <motion.div
                            key="add"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="flex items-center"
                          >
                            <ShoppingCart className="w-5 h-5 mr-2" /> Adicionar ao Carrinho
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-10">
              Nenhum pacote disponível no momento para esta categoria.
            </div>
          )}
        </div>

        {/* Service Details Modal */}
        <AnimatePresence>
          {selectedService && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedService(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden"
              >
                <button
                  onClick={() => setSelectedService(null)}
                  className="absolute top-6 right-6 p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-[#FF8C00] transition-colors z-10"
                >
                  <X size={24} />
                </button>

                <div className="p-8 sm:p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                  {selectedService.image && (
                    <div className="mb-8 rounded-2xl overflow-hidden aspect-video relative group bg-black flex items-center justify-center">
                      {selectedService.image.toLowerCase().endsWith('.mp4') ? (
                        <video
                          src={selectedService.image}
                          autoPlay
                          loop
                          muted
                          playsInline
                          controls
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img 
                          src={selectedService.image} 
                          alt={selectedService.nome}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    </div>
                  )}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl">
                      {getServiceIcon(selectedService.categoria)}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedService.nome}</h2>
                      <p className="text-[#FF8C00] font-medium">{selectedService.categoria}</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Descrição Detalhada</h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        {selectedService.descricao} Este serviço é projetado para atender às necessidades específicas do seu negócio, 
                        garantindo resultados profissionais e alinhados com as tendências atuais do mercado. Nossa equipe dedica-se 
                        a cada detalhe para superar suas expectativas.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">O que está incluído</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {details.works.slice(0, 4).map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <span className="text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Investimento</p>
                          <p className="text-3xl font-extrabold text-gray-900 dark:text-white">
                            {formatAOA(selectedService.preco)}
                          </p>
                        </div>
                        {selectedService.is_promo && (
                          <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-sm font-bold">
                            OFERTA ESPECIAL
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => handleAddToCart(e, selectedService)}
                        disabled={addedItems[selectedService.id]}
                        className={`w-full flex items-center justify-center py-4 px-6 rounded-xl font-bold text-white transition-all duration-300 ${
                          addedItems[selectedService.id]
                            ? 'bg-green-500'
                            : 'bg-gradient-to-r from-[#fec24e] to-[#FF8C00] hover:shadow-lg transform hover:-translate-y-1'
                        }`}
                      >
                        <AnimatePresence mode="wait">
                          {addedItems[selectedService.id] ? (
                            <motion.div
                              key="added"
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              className="flex items-center"
                            >
                              <Check className="w-5 h-5 mr-2" /> Adicionado ao Carrinho
                            </motion.div>
                          ) : (
                            <motion.div
                              key="add"
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              className="flex items-center"
                            >
                              <ShoppingCart className="w-5 h-5 mr-2" /> Adicionar ao Carrinho
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ServiceCategory;
