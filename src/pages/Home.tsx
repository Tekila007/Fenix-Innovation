import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Star, 
  Shield, 
  Zap, 
  Quote, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Copy,
  Share2,
  ExternalLink
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface PublicFeedback {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
  service_name: string | null;
  work_image: string[] | null;
  service_id: number | null;
}

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [publicFeedbacks, setPublicFeedbacks] = useState<PublicFeedback[]>([]);
  const [visibleFeedbacks, setVisibleFeedbacks] = useState(3);
  const [selectedFeedback, setSelectedFeedback] = useState<PublicFeedback | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const res = await axios.get('/api/feedbacks/public');
        setPublicFeedbacks(res.data);

        // Check for feedback ID in URL
        const feedbackId = searchParams.get('feedback');
        if (feedbackId) {
          const feedback = res.data.find((f: PublicFeedback) => f.id === parseInt(feedbackId));
          if (feedback) {
            setSelectedFeedback(feedback);
            setCurrentImageIndex(0);
          }
        }
      } catch (error) {
        console.error('Error fetching public feedbacks:', error);
      }
    };
    fetchFeedbacks();
  }, [searchParams]);

  const loadMore = () => {
    setVisibleFeedbacks(prev => prev + 3);
  };

  const handleShare = (id: number) => {
    const url = `${window.location.origin}/?feedback=${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de compartilhamento copiado!');
  };

  const handleCopyComment = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Comentário copiado!');
  };

  useEffect(() => {
    if (selectedFeedback) {
      setCurrentImageIndex(0);
      setDirection(0);
      toast('Você pode copiar o comentário ou compartilhar o feedback clicando nos ícones.', {
        icon: 'ℹ️',
        duration: 4000
      });
    }
  }, [selectedFeedback]);

  const nextImage = () => {
    if (selectedFeedback?.work_image) {
      setDirection(1);
      setCurrentImageIndex((prev) => (prev + 1) % selectedFeedback.work_image!.length);
    }
  };

  const prevImage = () => {
    if (selectedFeedback?.work_image) {
      setDirection(-1);
      setCurrentImageIndex((prev) => (prev - 1 + selectedFeedback.work_image!.length) % selectedFeedback.work_image!.length);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 pt-20 transition-colors duration-300">
      <Helmet>
        <title>Fênix Innovation | Agência de Design e Marketing Digital</title>
        <meta name="description" content="Transforme sua visão em realidade com a Fênix Innovation. Somos uma agência especializada em design de alto nível, marketing digital e desenvolvimento web." />
        <meta name="keywords" content="design, marketing digital, desenvolvimento web, agência de design, motion design, identidade visual" />
      </Helmet>

      <section className="relative overflow-hidden py-20 sm:py-32 lg:pb-32 xl:pb-36 min-h-[80vh] flex items-center">
        {/* Video Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-1/2 left-1/2 w-auto min-w-full min-h-full max-w-none -translate-x-1/2 -translate-y-1/2 object-cover opacity-20 dark:opacity-30"
          >
            <source src="https://cdn.pixabay.com/video/2020/05/25/40130-424911075_large.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 via-transparent to-gray-50 dark:from-gray-900/50 dark:via-transparent dark:to-gray-900 z-10" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="text-center max-w-3xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8"
            >
              Transforme sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fec24e] to-[#FF8C00]">Visão</span> em Realidade
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-gray-600 dark:text-gray-400 mb-10"
            >
              Agência internacional especializada em design de alto nível, marketing digital e desenvolvimento web. Elevamos sua marca ao próximo nível.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                to="/servicos"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-[#fec24e] to-[#FF8C00] rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
              >
                Ver Serviços
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/cadastro"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-full hover:border-[#FF8C00] dark:hover:border-[#fec24e] transition-all duration-200"
                >
                  Cadastrar-se
                </Link>
              )}
            </motion.div>
          </div>
        </div>

        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-30 dark:opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-[#fec24e] to-[#FF8C00] blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: <Star className="w-8 h-8 text-[#FF8C00]" />,
                title: 'Qualidade Premium',
                description: 'Entregamos resultados excepcionais com atenção aos mínimos detalhes.',
              },
              {
                icon: <Zap className="w-8 h-8 text-[#fec24e]" />,
                title: 'Entrega Rápida',
                description: 'Processos otimizados para garantir que seu projeto seja entregue no prazo.',
              },
              {
                icon: <Shield className="w-8 h-8 text-[#FF8C00]" />,
                title: 'Suporte Dedicado',
                description: 'Acompanhamento contínuo e suporte especializado para sua empresa.',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-8 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-shadow duration-300"
              >
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-6"
                >
                  {feature.icon}
                </motion.div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {Array.isArray(publicFeedbacks) && publicFeedbacks.length > 0 && (
        <section className="py-20 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4"
              >
                O que nossos clientes dizem
              </motion.h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Histórias de sucesso de quem confiou na Fênix Innovation
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              <AnimatePresence mode="popLayout">
                {Array.isArray(publicFeedbacks) && publicFeedbacks.slice(0, visibleFeedbacks).map((feedback, index) => (
                  <motion.div
                    key={feedback.id}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
                    onClick={() => setSelectedFeedback(feedback)}
                    className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 relative cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full"
                  >
                    <Quote className="absolute top-6 right-6 w-10 h-10 text-gray-100 dark:text-gray-700 group-hover:text-orange-100 dark:group-hover:text-orange-900/20 transition-colors" />
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#fec24e] to-[#FF8C00] rounded-full flex items-center justify-center text-white font-bold text-lg mr-4 shadow-md">
                          {feedback.user_avatar ? (
                            <img src={feedback.user_avatar} alt={feedback.user_name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            feedback.user_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">{feedback.user_name}</h4>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < feedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <motion.button 
                        whileHover={{ scale: 1.2, rotate: 15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(feedback.id);
                        }}
                        className="p-2 text-gray-400 hover:text-[#FF8C00] transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 z-10"
                        title="Compartilhar"
                      >
                        <Share2 size={18} />
                      </motion.button>
                    </div>
                    
                    {feedback.work_image && feedback.work_image.length > 0 && (
                      <div className="mb-6 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 aspect-video relative group/img">
                        <img 
                          src={feedback.work_image[0]} 
                          alt={`Trabalho para ${feedback.user_name}`} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          loading="lazy"
                        />
                        {feedback.work_image.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            +{feedback.work_image.length - 1} fotos
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-gray-600 dark:text-gray-400 italic relative z-10 line-clamp-3 flex-grow">
                      "{feedback.comment}"
                    </p>
                    
                    <div className="mt-6 flex items-center text-[#FF8C00] font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      Ver detalhes <ArrowRight className="ml-2 w-4 h-4" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {Array.isArray(publicFeedbacks) && visibleFeedbacks < publicFeedbacks.length && (
              <div className="text-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={loadMore}
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-8 py-3 rounded-full font-bold shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-700 transition-all"
                >
                  Carregar mais depoimentos
                </motion.button>
              </div>
            )}
            </div>
          </section>
        )}

        {/* Feedback Detail Modal */}
        {selectedFeedback && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl max-w-2xl w-full overflow-hidden relative"
            >
              <button 
                onClick={() => setSelectedFeedback(null)}
                className="absolute top-6 right-6 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#fec24e] to-[#FF8C00] rounded-2xl flex items-center justify-center text-white font-bold text-2xl mr-6 shadow-lg shadow-orange-500/20">
                      {selectedFeedback.user_avatar ? (
                        <img src={selectedFeedback.user_avatar} alt={selectedFeedback.user_name} className="w-full h-full rounded-2xl object-cover" />
                      ) : (
                        selectedFeedback.user_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedFeedback.user_name}</h3>
                      <div className="flex gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${i < selectedFeedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleCopyComment(selectedFeedback.comment)}
                      className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors text-gray-600 dark:text-gray-300"
                      title="Copiar comentário"
                    >
                      <Copy size={20} />
                    </button>
                    <button 
                      onClick={() => handleShare(selectedFeedback.id)}
                      className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors text-gray-600 dark:text-gray-300"
                      title="Compartilhar"
                    >
                      <Share2 size={20} />
                    </button>
                  </div>
                </div>

                {selectedFeedback.work_image && selectedFeedback.work_image.length > 0 && (
                  <div className="mb-8 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-inner bg-gray-50 dark:bg-gray-900/50 relative group">
                    <div className="relative aspect-video flex items-center justify-center overflow-hidden bg-black">
                      <AnimatePresence initial={false} custom={direction}>
                        <motion.img
                          key={currentImageIndex}
                          src={selectedFeedback.work_image[currentImageIndex]}
                          custom={direction}
                          variants={{
                            enter: (direction: number) => ({
                              x: direction > 0 ? 300 : -300,
                              opacity: 0
                            }),
                            center: {
                              zIndex: 1,
                              x: 0,
                              opacity: 1
                            },
                            exit: (direction: number) => ({
                              zIndex: 0,
                              x: direction < 0 ? 300 : -300,
                              opacity: 0
                            })
                          }}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                          }}
                          className="absolute w-full h-full object-contain"
                        />
                      </AnimatePresence>

                      {selectedFeedback.work_image.length > 1 && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); prevImage(); }}
                            className="absolute left-4 p-2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <ChevronLeft className="w-6 h-6" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); nextImage(); }}
                            className="absolute right-4 p-2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <ChevronRight className="w-6 h-6" />
                          </button>

                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {selectedFeedback.work_image.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setCurrentImageIndex(i)}
                                className={`w-2 h-2 rounded-full transition-all ${i === currentImageIndex ? 'bg-[#FF8C00] w-6' : 'bg-gray-300 dark:bg-gray-600'}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 mb-8">
                  <Quote className="w-8 h-8 text-orange-500/20 mb-2" />
                  <p className="text-lg text-gray-700 dark:text-gray-300 italic leading-relaxed">
                    {selectedFeedback.comment}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-center sm:text-left">
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Serviço Realizado</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{selectedFeedback.service_name || 'Design Personalizado'}</p>
                  </div>
                  <Link
                    to="/servicos"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-[#fec24e] to-[#FF8C00] rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                  >
                    Escolher este serviço
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
};

export default Home;
