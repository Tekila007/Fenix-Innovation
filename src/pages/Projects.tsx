import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  Send, 
  MessageSquare, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Heart, 
  Sparkles, 
  User, 
  Bookmark, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../contexts/CartContext';
import toast from 'react-hot-toast';

interface Project {
  id: number;
  title: string;
  category: string;
  image: string;
  description: string;
  price?: string;
  duration?: string;
  delivery_method?: string;
  status?: string;
  video?: string;
  images?: string; // stringified JSON
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [likedProjects, setLikedProjects] = useState<number[]>([]);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await axios.get('/api/projects');
        setProjects(res.data);
      } catch (error) {
        console.error('Erro ao buscar projetos:', error);
      }
    };
    fetchProjects();

    const savedLikes = localStorage.getItem('likedProjects');
    if (savedLikes) {
      try {
        setLikedProjects(JSON.parse(savedLikes));
      } catch (e) {}
    }
  }, []);

  const handleLike = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated;
    if (likedProjects.includes(id)) {
      updated = likedProjects.filter(pId => pId !== id);
      toast.success('Removido dos favoritos!');
    } else {
      updated = [...likedProjects, id];
      toast.success('Adicionado aos favoritos!');
    }
    setLikedProjects(updated);
    localStorage.setItem('likedProjects', JSON.stringify(updated));
  };

  const getMediaList = (proj: Project): { type: 'image' | 'video'; url: string }[] => {
    const list: { type: 'image' | 'video'; url: string }[] = [];
    
    // Add main video if exists
    if (proj.video) {
      list.push({ type: 'video', url: proj.video });
    } else if (proj.image && proj.image.toLowerCase().endsWith('.mp4')) {
      list.push({ type: 'video', url: proj.image });
    }

    // Parse gallery
    if (proj.images) {
      try {
        const parsed = JSON.parse(proj.images);
        if (Array.isArray(parsed)) {
          parsed.forEach((img: string) => {
            if (img.toLowerCase().endsWith('.mp4')) {
              // Avoid duplicate video
              if (!list.some(item => item.url === img)) {
                list.push({ type: 'video', url: img });
              }
            } else {
              if (!list.some(item => item.url === img)) {
                list.push({ type: 'image', url: img });
              }
            }
          });
        }
      } catch (e) {
        // Safe fallback
      }
    }

    // Add main image if not present in list
    if (proj.image && !proj.image.toLowerCase().endsWith('.mp4')) {
      if (!list.some(item => item.url === proj.image)) {
        list.unshift({ type: 'image', url: proj.image });
      }
    }

    // Absolute fallback
    if (list.length === 0 && proj.image) {
      list.push({ type: 'image', url: proj.image });
    }

    return list;
  };

  const getInclusions = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('arte') || cat.includes('identidade') || cat.includes('logo')) {
      return {
        revisions: 'Revisões ilimitadas até aprovação final',
        files: 'PDF, Adobe Illustrator (.AI), EPS, SVG e PNG transparente',
        formats: 'Formatos otimizados para Web e Impressão de alta definição',
        support: 'Suporte pós-entrega VIP ativo por 30 dias'
      };
    } else if (cat.includes('rede') || cat.includes('social') || cat.includes('media')) {
      return {
        revisions: 'Até 5 rodadas de alterações por arte',
        files: 'Arquivos PNG de alta resolução + Projetos fonte editáveis (PSD)',
        formats: 'Formatos Feed (1:1) e Stories/Reels (9:16) perfeitamente ajustados',
        support: 'Suporte pós-entrega de 7 dias úteis para configurações'
      };
    } else if (cat.includes('motion') || cat.includes('video') || cat.includes('filme')) {
      return {
        revisions: 'Até 3 rodadas de alterações completas inclusas',
        files: 'Ficheiro final MP4 em Ultra HD 4K e trilha sonora licenciada',
        formats: 'Adaptações otimizadas para Redes e Telas de projeção',
        support: 'Ajustes grátis de dimensões por 15 dias após entrega'
      };
    } else if (cat.includes('web') || cat.includes('site') || cat.includes('landing')) {
      return {
        revisions: 'Ajustes ilimitados no protótipo e 3 revisões em produção',
        files: 'Código-fonte limpo no GitHub e arquivos de Design no Figma',
        formats: 'Design 100% responsivo para Mobile, Desktop e Tablet',
        support: '60 dias de hospedagem e assistência técnica inclusas'
      };
    } else {
      return {
        revisions: 'Até 4 rodadas de revisões e ajustes finos',
        files: 'Arquivos finais nativos de alta fidelidade prontos para uso',
        formats: 'Formatos múltiplos e escaláveis para diversas plataformas',
        support: 'Suporte ao cliente preferencial de 15 dias úteis'
      };
    }
  };

  const handleNextProject = () => {
    if (!selectedProject || projects.length === 0) return;
    const currentIndex = projects.findIndex(p => p.id === selectedProject.id);
    const nextIndex = (currentIndex + 1) % projects.length;
    setSelectedProject(projects[nextIndex]);
    setActiveMediaIndex(0);
  };

  const handleSolicitar = (proj: Project) => {
    // Determine fair numeric price based on range or fallback
    let numericPrice = 35000;
    if (proj.price) {
      const parsedNum = parseInt(proj.price.replace(/[^0-9]/g, ''));
      if (!isNaN(parsedNum) && parsedNum > 1000) {
        numericPrice = parsedNum;
      }
    } else if (proj.category.toLowerCase().includes('web')) {
      numericPrice = 80000;
    } else if (proj.category.toLowerCase().includes('motion')) {
      numericPrice = 40000;
    } else if (proj.category.toLowerCase().includes('identidade')) {
      numericPrice = 50000;
    }

    addToCart({
      id: proj.id + 5000, // Safe offsets to distinguish from store items
      nome: `Serviço Personalizado: ${proj.title}`,
      preco: numericPrice,
      descricao: `Serviço premium sob demanda inspirado no projeto do portfólio "${proj.title}"`,
      categoria: proj.category,
      image: proj.image
    });

    toast.success('Projeto adicionado como serviço no carrinho de compras!');
    navigate('/carrinho');
  };

  const handleWhatsApp = (proj: Project) => {
    const encodedMessage = encodeURIComponent(
      `Olá, Fênix Innovation! Gostei imensamente do projeto "${proj.title}" (${proj.category}) no vosso portfólio e gostaria de solicitar um orçamento ou mais detalhes para um trabalho similar.`
    );
    window.open(`https://wa.me/244923000000?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 pt-24 pb-20 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Banner de apresentação */}
        <div className="text-center mb-16 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-orange-500/10 rounded-full blur-[80px]" />
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black mb-4 tracking-tight"
          >
            Nossos <span className="bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">Projetos de Elite</span>
          </motion.h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium">
            Explore o nosso portfólio criativo de alta costura digital. Clique em qualquer caso de sucesso para mergulhar nos detalhes do serviço, prazos, preços e inclusões exclusivas.
          </p>
        </div>

        {/* Grelha de Projetos principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => {
            const isLiked = likedProjects.includes(project.id);
            const priceVal = project.price || "A partir de 35.000 Kz";
            const isVideo = project.image && project.image.toLowerCase().endsWith('.mp4');

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                onClick={() => {
                  setSelectedProject(project);
                  setActiveMediaIndex(0);
                }}
                className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl border border-gray-100 dark:border-gray-700/80 transition-all duration-300 group cursor-pointer flex flex-col justify-between h-full relative"
              >
                {/* Media Wrapper */}
                <div className="relative h-64 overflow-hidden bg-black flex items-center justify-center">
                  {isVideo ? (
                    <video
                      src={project.image}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover transition-all duration-500"
                    />
                  ) : (
                    <img
                      src={project.image}
                      alt={project.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  
                  {/* Category Badge overlay */}
                  <span className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-md text-orange-400 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-orange-500/20">
                    {project.category}
                  </span>

                  {/* Icon Like overlay */}
                  <button
                    onClick={(e) => handleLike(project.id, e)}
                    className="absolute top-4 right-4 z-10 w-9 h-9 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 hover:border-orange-500 transition-colors"
                  >
                    <Heart className={`w-4.5 h-4.5 transition-colors ${isLiked ? 'text-red-500 fill-red-500' : 'text-gray-300'}`} />
                  </button>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-6">
                    <p className="text-white text-sm font-semibold tracking-wide flex items-center gap-1.5">
                      Visualizar Caso de Sucesso
                      <ArrowRight className="w-4 h-4 text-orange-400 animate-pulse" />
                    </p>
                  </div>
                </div>

                {/* Content details under card */}
                <div className="p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight group-hover:text-orange-500 transition-colors">
                      {project.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                      ))}
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-bold ml-1">5.0 (Auditado)</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6 line-clamp-3">
                      {project.description}
                    </p>
                  </div>

                  {/* Bottom pricing meta */}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-extrabold">Preço Estimado</span>
                      <span className="text-sm font-black text-orange-500 dark:text-amber-500 uppercase">{priceVal}</span>
                    </div>
                    <span className="text-xs font-extrabold text-white bg-orange-600 py-1.5 px-3.5 rounded-lg select-none">
                      {project.status || 'Disponível'}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* MODAL / VISUALIZADOR DE PROJETOS DE ALTA PERFORMANCE */}
        <AnimatePresence>
          {selectedProject && (() => {
            const mediaList = getMediaList(selectedProject);
            const activeMedia = mediaList[activeMediaIndex] || mediaList[0];
            const inclusions = getInclusions(selectedProject.category);
            const priceVal = selectedProject.price || "A partir de 35.000 Kz";
            const deliveryVal = selectedProject.duration || "7 dias";
            const deliveryMethodVal = selectedProject.delivery_method || "Google Drive";
            const statusVal = selectedProject.status || "Disponível";

            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 md:p-8"
              >
                {/* Close Button top-right (floating desktop only) */}
                <button
                  onClick={() => setSelectedProject(null)}
                  className="absolute top-6 right-6 z-55 w-12 h-12 bg-slate-900 border border-slate-800 text-gray-400 hover:text-white rounded-full flex items-center justify-center transition-all shadow-xl hover:scale-110"
                  aria-label="Voltar ao Portfólio"
                  id="close-btn"
                >
                  <X className="w-6 h-6" />
                </button>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 30 }}
                  transition={{ type: "spring", damping: 25, stiffness: 180 }}
                  className="bg-slate-900 text-white rounded-[32px] overflow-hidden max-w-6xl w-full border border-slate-800 shadow-2xl flex flex-col lg:flex-row relative z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* LEFT COLUMN: VISUALIZADOR DE MÉDIA E GALERIA */}
                  <div className="w-full lg:w-3/5 p-4 sm:p-8 flex flex-col justify-between bg-slate-950/80 relative border-b lg:border-b-0 lg:border-r border-slate-800/80">
                    <div className="relative">
                      {/* Floating Category Tag inside Player */}
                      <span className="absolute top-4 left-4 z-20 bg-orange-600/90 text-white text-[10px] font-black uppercase tracking-[2px] px-3.5 py-1.5 rounded-full shadow-lg">
                        {selectedProject.category}
                      </span>

                      {/* MAIN MEDIA SCREEN */}
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center group flex-shrink-0">
                        {activeMedia && activeMedia.type === 'video' ? (
                          <div className="w-full h-full relative">
                            <video
                              key={activeMedia.url}
                              src={activeMedia.url}
                              controls
                              autoPlay={false}
                              playsInline
                              className="w-full h-full object-cover"
                            />
                            {/* Overlay message reminding playability */}
                            <div className="absolute top-4 right-4 pointer-events-none bg-black/60 backdrop-blur text-[10px] font-bold text-orange-400 px-2 py-1 rounded border border-orange-500/10">
                              Demonstração de Vídeo Ativa
                            </div>
                          </div>
                        ) : (
                          <img
                            key={activeMedia ? activeMedia.url : 'fallback'}
                            src={activeMedia ? activeMedia.url : selectedProject.image}
                            alt={selectedProject.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                            referrerPolicy="no-referrer"
                          />
                        )}

                        {/* Gallery Control cheatsheet overlay */}
                        {mediaList.length > 1 && (
                          <div className="absolute bottom-4 left-4 z-10 bg-black/60 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300">
                            {activeMediaIndex + 1} de {mediaList.length} mídias
                          </div>
                        )}
                      </div>

                      {/* GALERIA THUMBNAILS (Carrossel Interativo) */}
                      {mediaList.length > 1 && (
                        <div className="mt-5 space-y-2">
                          <label className="text-[10px] uppercase font-black tracking-widest text-[#FF8C00]">Navegar pelas mídias do Caso</label>
                          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                            {mediaList.map((media, idx) => (
                              <button
                                key={idx}
                                onClick={() => setActiveMediaIndex(idx)}
                                className={`snap-start flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 relative transition-all ${
                                  idx === activeMediaIndex 
                                    ? 'border-orange-500 shadow-lg shadow-orange-500/20 scale-102' 
                                    : 'border-slate-800 hover:border-slate-600'
                                }`}
                              >
                                {media.type === 'video' ? (
                                  <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
                                    <Play className="w-5 h-5 text-orange-500 z-10" />
                                    <div className="absolute inset-0 bg-black/20" />
                                  </div>
                                ) : (
                                  <img src={media.url} alt="Galeria" className="w-full h-full object-cover" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick navigation bottom hint */}
                    <div className="mt-8 pt-4 border-t border-slate-900 flex items-center justify-between text-xs text-gray-500 font-mono">
                      <span>Ref / ID do Trabalho: FX-{selectedProject.id}</span>
                      <span>100% Auditado</span>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: PREÇOS, INCLUSÕES, PRAZOS E METADATA */}
                  <div className="w-full lg:w-2/5 p-6 sm:p-8 flex flex-col justify-between bg-slate-900">
                    <div className="space-y-6">
                      {/* Name of Portfolio Service */}
                      <div>
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-none text-white uppercase">
                            {selectedProject.title}
                          </h2>
                          <button
                            onClick={() => setSelectedProject(null)}
                            className="lg:hidden text-gray-400 hover:text-white p-1 rounded-full bg-slate-800"
                            aria-label="Minimizar"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-orange-400 text-xs font-bold uppercase tracking-widest">
                          {selectedProject.category}
                        </p>
                      </div>

                      {/* Descricao */}
                      <div className="text-gray-400 text-sm leading-relaxed border-b border-slate-800/80 pb-5">
                        <p>{selectedProject.description}</p>
                      </div>

                      {/* Informações Estruturadas (Preços, Duração, Método e Status) */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-850">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#fec24e] font-black mb-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Preço Base</span>
                          </div>
                          <p className="text-sm font-extrabold text-white uppercase">{priceVal}</p>
                        </div>

                        <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-850">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#FF8C00] font-black mb-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Entrega Média</span>
                          </div>
                          <p className="text-sm font-extrabold text-white">{deliveryVal}</p>
                        </div>

                        <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-850">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-orange-400/80 font-black mb-1">
                            <Send className="w-3.5 h-3.5" />
                            <span>Método Entrega</span>
                          </div>
                          <p className="text-sm font-extrabold text-white">{deliveryMethodVal}</p>
                        </div>

                        <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-850">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-orange-400/80 font-black mb-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Status</span>
                          </div>
                          <p className="text-sm font-extrabold text-white uppercase">{statusVal}</p>
                        </div>
                      </div>

                      {/* O QUE ESTÁ INCLUSO */}
                      <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/70 space-y-3.5">
                        <h4 className="text-xs font-black uppercase tracking-widest text-orange-400 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-orange-400" />
                          <span>Especificações e Entregáveis</span>
                        </h4>

                        <div className="space-y-3 text-xs text-gray-300">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <p className="leading-tight"><strong className="text-white">Ajustes:</strong> {inclusions.revisions}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <p className="leading-tight"><strong className="text-white">Arquivos entregues:</strong> {inclusions.files}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <p className="leading-tight"><strong className="text-white">Formatos:</strong> {inclusions.formats}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <p className="leading-tight"><strong className="text-white">Garantia:</strong> {inclusions.support}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BOTÕES DE AÇÃO TOTALMENTE OPERACIONAIS */}
                    <div className="space-y-3.5 mt-8 border-t border-slate-800/80 pt-6">
                      <div className="grid grid-cols-2 gap-3.5">
                        {/* Solicitar Serviço */}
                        <button
                          onClick={() => handleSolicitar(selectedProject)}
                          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3.5 px-4 rounded-xl font-bold text-center text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/10 active:scale-98 transition-all"
                        >
                          Solicitar Serviço
                          <ArrowRight className="w-4 h-4" />
                        </button>

                        {/* WhatsApp Direct */}
                        <button
                          onClick={() => handleWhatsApp(selectedProject)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 rounded-xl font-bold text-center text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Me ligar / WhatsApp
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        {/* Ver Próximo Projeto */}
                        <button
                          onClick={handleNextProject}
                          className="w-full bg-slate-800 hover:bg-slate-705 text-white py-3 px-4 rounded-xl font-bold text-center text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                        >
                          Próximo Projeto
                          <ChevronRight className="w-4 h-4 text-orange-400" />
                        </button>

                        {/* Voltar ao Portfólio */}
                        <button
                          onClick={() => setSelectedProject(null)}
                          className="w-full bg-slate-950 border border-slate-800 hover:text-white text-gray-400 py-3 px-4 rounded-xl font-bold text-center text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                        >
                          Voltar ao Portfólio
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Projects;
