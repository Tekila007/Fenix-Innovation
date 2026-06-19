import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, X, Send, Bot, User, Trash2, 
  ChevronDown, Maximize2, Minimize2, Sparkles, 
  ExternalLink, Layers, PhoneCall, Settings, 
  Briefcase, FileText, Lock, Volume2, VolumeX, Eye
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Message {
  id?: number;
  sender_role: 'user' | 'admin' | 'ai';
  message: string;
  created_at: string;
  status?: 'active' | 'deleted_for_all';
  options?: { label: string; value: string }[];
}

interface Service {
  id: number;
  nome: string;
  preco: number;
  descricao: string;
  categoria: string;
}

const ChatBot = () => {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'normal' | 'expanded' | 'fullscreen'>('normal');
  const [services, setServices] = useState<Service[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(true);
  
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef<string>(localStorage.getItem('chat_session_id') || `session_${Math.random().toString(36).substring(2, 11)}`);

  // Audio effects via AudioContext (pure code, no asset required)
  const playSampleSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 chime
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08); // A5 chime

      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.22);
    } catch (error) {
      console.warn('AudioContext failed:', error);
    }
  };

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await axios.get('/api/services');
        setServices(response.data);
      } catch (error) {
        console.error('Error fetching services:', error);
      }
    };
    if (isAuthenticated) {
      fetchServices();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!localStorage.getItem('chat_session_id')) {
      localStorage.setItem('chat_session_id', sessionId.current);
    }

    if (isOpen && isAuthenticated) {
      // Clear unread badge on open
      setUnreadCount(0);
      
      socketRef.current = io();
      
      socketRef.current.on('connect', () => {
        socketRef.current?.emit('join', {
          room: sessionId.current,
          role: isAdmin ? 'admin' : 'user',
          userId: user?.id
        });
      });

      socketRef.current.on('receive_message', (message: Message) => {
        setMessages(prev => {
          const isDuplicate = prev.some(m => 
            (m.id && m.id === message.id) || 
            (m.message === message.message && m.sender_role === message.sender_role && m.created_at === message.created_at)
          );
          if (isDuplicate) return prev;
          
          // Sound & Unread trigger
          if (message.sender_role !== 'user' && (isMinimized || !isOpen)) {
            setUnreadCount(c => c + 1);
            playSampleSound();
          } else if (message.sender_role !== 'user') {
            playSampleSound();
          }

          return [...prev, message];
        });
      });

      socketRef.current.on('admin_status', (data: { online: boolean }) => {
        setIsAdminOnline(data.online);
      });

      socketRef.current.on('message_deleted', (data: { messageId: number, type: 'self' | 'all' }) => {
        if (data.type === 'all') {
          setMessages(prev => prev.map(msg => 
            msg.id === data.messageId ? { ...msg, status: 'deleted_for_all', message: 'Esta mensagem foi eliminada' } : msg
          ));
        }
      });

      fetchHistory();
    }

    return () => {
      socketRef.current?.disconnect();
    };
  }, [isOpen, isAdmin, user?.id, isAuthenticated]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, isLoadingAI]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`/api/chat/history/${sessionId.current}`);
      const history = response.data;
      setMessages(history);

      if (history.length === 0 && !isAdmin) {
        sendInitialGreeting();
      } else {
        setShowQuickMenu(false);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const sendInitialGreeting = () => {
    const greetingText = `Olá, ${user?.name || 'Cliente'}! Seja muito bem-vindo à Fénix Innovation. 👋\n\nSou o seu Assistente Virtual e estou aqui para apoiar no que for necessário em design corporativo, motion design, marcas incríveis e tecnologia de alto nível de desempenho.`;
    
    const initialMsg: Message = {
      sender_role: 'ai',
      message: greetingText,
      created_at: new Date().toISOString()
    };
    
    setMessages([initialMsg]);
    setShowQuickMenu(true);

    // Save to DB via API
    axios.post('/api/chatbot/save', {
      session_id: sessionId.current,
      sender_role: 'ai',
      message: initialMsg.message
    }).catch(err => console.error('Error saving initial greeting:', err));
  };

  const handleOptionClick = async (option: { label: string; value: string }) => {
    if (!isAuthenticated) return;

    const userMsg: Message = {
      sender_role: 'user',
      message: option.label,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    
    socketRef.current?.emit('send_message', {
      sender_id: user?.id || null,
      session_id: sessionId.current,
      sender_role: 'user',
      message: option.label,
      room: sessionId.current,
      created_at: userMsg.created_at
    });

    if (option.value.startsWith('service_')) {
      const serviceId = parseInt(option.value.split('_')[1]);
      const service = services.find(s => s.id === serviceId);
      
      if (service) {
        const aiMsg: Message = {
          sender_role: 'ai',
          message: `### ✨ **${service.nome}**\n\n${service.descricao}\n\n* **Investimento Estimado**: ${service.preco.toLocaleString('pt-PT', { style: 'currency', currency: 'AOA' }).replace('EUR', 'Kz')}\n* **Atendimento Personalizado**: Gostaria de fechar um orçamento ou ajustar as especificações para este serviço? No nosso menu abaixo você pode iniciar o pedido diretamente!`,
          created_at: new Date().toISOString()
        };
        
        setIsLoadingAI(true);
        setTimeout(() => {
          setIsLoadingAI(false);
          setMessages(prev => [...prev, aiMsg]);
          axios.post('/api/chatbot/save', {
            session_id: sessionId.current,
            sender_role: 'ai',
            message: aiMsg.message
          });
          
          socketRef.current?.emit('send_message', {
            session_id: sessionId.current,
            sender_role: 'ai',
            message: aiMsg.message,
            room: sessionId.current,
            created_at: aiMsg.created_at
          });
        }, 800);
      }
    }
  };

  const executeQuickAction = async (action: string) => {
    let responseText = "";
    let systemChoice = "";
    
    if (action === 'services') {
      responseText = "Atualmente oferecemos excelência em design e tecnologia. Selecione uma opção específica abaixo nos botões de serviços para obter detalhes completos de prazos e valores:";
      const serviceOptions = services.map(s => ({ label: s.nome, value: `service_${s.id}` }));
      
      const userMsg: Message = {
        sender_role: 'user',
        message: "Visualizar Serviços",
        created_at: new Date().toISOString()
      };
      
      const aiMsg: Message = {
        sender_role: 'ai',
        message: responseText,
        created_at: new Date().toISOString(),
        options: serviceOptions
      };
      
      setMessages(prev => [...prev, userMsg, aiMsg]);
      setShowQuickMenu(false);

      // Save user action
      axios.post('/api/chatbot/save', { session_id: sessionId.current, sender_role: 'user', message: userMsg.message });
      axios.post('/api/chatbot/save', { session_id: sessionId.current, sender_role: 'ai', message: aiMsg.message });
      
      socketRef.current?.emit('send_message', {
        session_id: sessionId.current,
        sender_role: 'user',
        message: userMsg.message,
        room: sessionId.current,
        created_at: userMsg.created_at
      });
      socketRef.current?.emit('send_message', {
        session_id: sessionId.current,
        sender_role: 'ai',
        message: aiMsg.message,
        room: sessionId.current,
        created_at: aiMsg.created_at
      });
      return;
    }

    if (action === 'portfolio') {
      toast.success('Redirecionando para o Portfólio...');
      window.location.hash = '/projetos';
      setIsOpen(false);
      return;
    }

    if (action === 'budget') {
      toast.success('Redirecionando para solicitar orçamento...');
      window.location.hash = '/servicos';
      setIsOpen(false);
      return;
    }

    if (action === 'my_projects') {
      toast.success('Abrindo página de pedidos...');
      window.location.hash = '/meus-pedidos';
      setIsOpen(false);
      return;
    }

    if (action === 'catalog') {
      responseText = "### 📚 **Catálogo de Especialidades Fênix**\n\nNossa agência cobre com perfeição:\n\n* **Design corporativo**: Identidade Visual marcante, Design Gráfico de alta fidelidade e layouts de Impressão Executivos.\n* **Design Audiovisual**: Motion Design refinado e interações de vídeo atraentes.\n* **Tecnologia & Web**: Desenvolvimento de Websites de alto desempenho e Aplicações Web robustas com SEO otimizado.\n* **Marketing & Estratégia**: Campanhas digitais integradas e Direção de Arte de impacto.\n\nTodos os nossos layouts contam com revisões ilimitadas no modelo Premium!";
    } else if (action === 'contact') {
      responseText = "### 📞 **Fale com um Especialista**\n\nDeseja um contacto directo rápido via chamada ou WhatsApp?\n\n* 📱 **WhatsApp Comercial**: +244 923 000 000\n* ✉️ **E-mail institucional**: contacto@fenix-innovation.com\n* 🕒 **Atendimento**: Segunda a Sexta, das 8h às 18h.\n\nVocê também pode solicitar via chat e um de nossos gestores assumirá esta conversa imediatamente se estivermos online!";
    } else if (action === 'settings') {
      window.location.hash = '/perfil';
      setIsOpen(false);
      return;
    }

    if (responseText) {
      const userMsg: Message = {
        sender_role: 'user',
        message: `Atalho rápido: ${action === 'catalog' ? 'Catálogo Completo' : 'Falar com Especialista'}`,
        created_at: new Date().toISOString()
      };
      const aiMsg: Message = {
        sender_role: 'ai',
        message: responseText,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMsg, aiMsg]);
      setShowQuickMenu(false);

      axios.post('/api/chatbot/save', { session_id: sessionId.current, sender_role: 'user', message: userMsg.message });
      axios.post('/api/chatbot/save', { session_id: sessionId.current, sender_role: 'ai', message: aiMsg.message });

      socketRef.current?.emit('send_message', {
        session_id: sessionId.current,
        sender_role: 'user',
        message: userMsg.message,
        room: sessionId.current,
        created_at: userMsg.created_at
      });
      socketRef.current?.emit('send_message', {
        session_id: sessionId.current,
        sender_role: 'ai',
        message: aiMsg.message,
        room: sessionId.current,
        created_at: aiMsg.created_at
      });
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isAuthenticated) return;

    const userMessage = input;
    setInput('');
    setShowQuickMenu(false);

    const messageData = {
      sender_id: user?.id || null,
      session_id: sessionId.current,
      sender_role: isAdmin ? 'admin' : 'user',
      message: userMessage,
      room: sessionId.current,
      created_at: new Date().toISOString()
    };

    socketRef.current?.emit('send_message', messageData);

    const isUserSide = !isAdmin;
    if (isUserSide && !isAdminOnline) {
      setIsLoadingAI(true);
      try {
        const response = await axios.post('/api/chatbot', {
          message: userMessage,
          sessionId: sessionId.current
        });

        const aiText = response.data.text || "Desculpe, não consegui processar sua solicitação comercial no momento.";

        const aiMsg: Message = {
          sender_role: 'ai',
          message: aiText,
          created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, aiMsg]);

        // Broadcast AI message via Socket so connected Admin gets instant sync
        socketRef.current?.emit('send_message', {
          session_id: sessionId.current,
          sender_role: 'ai',
          message: aiText,
          room: sessionId.current,
          created_at: aiMsg.created_at
        });

      } catch (error: any) {
        console.error('Chatbot error:', error);
        toast.error('Ocorreu um erro ao processar a resposta da IA.');
      } finally {
        setIsLoadingAI(false);
      }
    }
  };

  const handleDeleteMessage = async (messageId: number, type: 'self' | 'all') => {
    try {
      await axios.delete(`/api/chat/message/${messageId}`, { data: { type } });
      socketRef.current?.emit('delete_message', { messageId, type, room: sessionId.current });
      
      if (type === 'self') {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      } else {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, status: 'deleted_for_all', message: 'Esta mensagem foi eliminada' } : msg
        ));
      }
      toast.success('Mensagem eliminada com sucesso');
    } catch (error) {
      toast.error('Erro ao eliminar mensagem');
    }
  };

  const toggleLayout = () => {
    if (layoutMode === 'normal') {
      setLayoutMode('expanded');
    } else if (layoutMode === 'expanded') {
      setLayoutMode('fullscreen');
    } else {
      setLayoutMode('normal');
    }
  };

  // Dimensional configuration based on state
  const getLayoutClasses = () => {
    if (isMinimized) return 'h-16 w-80 md:w-96 bottom-6 right-6';
    if (layoutMode === 'fullscreen') return 'fixed inset-0 w-screen h-screen rounded-none z-50';
    if (layoutMode === 'expanded') return 'fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[540px] md:w-[620px] h-[780px] max-h-[85vh]';
    return 'fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[380px] md:w-[410px] h-[480px] sm:h-[610px] max-h-[85vh] sm:max-h-[82vh]';
  };

  return (
    <>
      {/* Floating Button with real time unread state */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
          setUnreadCount(0);
        }}
        className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-3xl border border-white/20 transition-all duration-300 ${
          isOpen && !isMinimized ? 'scale-0 pointer-events-none' : 'scale-100'
        } bg-gradient-to-br from-[#FFA500] via-[#FF8C00] to-[#E67E22] text-white flex items-center justify-center`}
      >
        <MessageSquare className="w-6 h-6" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1.5 -right-1.5 bg-[#ef4444] text-[10px] font-bold text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce"
            >
              {unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Main Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.93 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`bg-white dark:bg-gray-950 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-gray-900 transition-all duration-300 ${getLayoutClasses()}`}
          >
            {/* Elegant Header */}
            <div className="p-4 bg-gradient-to-r from-[#FF8C00] via-[#E67E22] to-[#D35400] text-white flex items-center justify-between rounded-t-3xl shadow-md border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-md border border-white/25 shadow-inner">
                  <Bot size={22} className="text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight flex items-center gap-1">
                    Assistente Fênix <Sparkles size={14} className="text-amber-300 animate-spin-slow" />
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAdminOnline ? 'bg-green-400' : 'bg-amber-400'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isAdminOnline ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                    </span>
                    <span className="text-[10px] font-semibold tracking-wider uppercase opacity-90">
                      {isAdminOnline ? '● Admin Online' : '● ChatBot Ativo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Window controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1.5 hover:bg-white/15 rounded-lg transition-all text-white/80 hover:text-white"
                  title={soundEnabled ? 'Silenciar assistente' : 'Ativar áudio'}
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                {!isMinimized && layoutMode !== 'fullscreen' && (
                  <button 
                    onClick={toggleLayout}
                    className="p-1.5 hover:bg-white/15 rounded-lg transition-all text-white/80 hover:text-white"
                    title={layoutMode === 'expanded' ? 'Tamanho menor' : 'Tamanho expandido'}
                  >
                    <Maximize2 size={15} />
                  </button>
                )}
                {layoutMode === 'fullscreen' && (
                  <button 
                    onClick={() => setLayoutMode('normal')}
                    className="p-1.5 hover:bg-white/15 rounded-lg transition-all text-white/80 hover:text-white"
                    title="Diminuir"
                  >
                    <Minimize2 size={15} />
                  </button>
                )}
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/15 rounded-lg transition-all text-white/80 hover:text-white"
                >
                  <ChevronDown size={17} className={`transform transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/15 rounded-lg transition-all text-[#FFDCC4] hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* If NOT Authenticated, show premium gate with absolute blocking */}
            {!isMinimized && !isAuthenticated ? (
              <div className="flex-grow flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-950 text-center">
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/10 rounded-3xl flex items-center justify-center shadow-lg mb-6"
                >
                  <Lock size={32} className="text-orange-500 animate-pulse" />
                </motion.div>
                <h4 className="text-gray-900 dark:text-white font-extrabold text-lg tracking-tight mb-2">
                  Área Reservada
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed max-w-xs">
                  Olá! Para utilizar o Assistente Virtual da Fénix Innovation é necessário possuir uma conta. Faça login ou cadastre-se para continuar.
                </p>
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  <button
                    onClick={() => {
                      window.location.hash = '/cadastro?mode=login';
                      setIsOpen(false);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-[#FF8C00] to-[#E67E22] text-white font-bold rounded-2xl shadow-md hover:shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all font-sans text-sm active:scale-98"
                  >
                    Entrar na Conta
                  </button>
                  <button
                    onClick={() => {
                      window.location.hash = '/cadastro?mode=register';
                      setIsOpen(false);
                    }}
                    className="w-full py-3 bg-white dark:bg-gray-900 text-[#FF8C00] dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 hover:bg-orange-50 dark:hover:bg-orange-950/20 font-bold rounded-2xl transition-all font-sans text-sm active:scale-98"
                  >
                    Criar Nova Conta
                  </button>
                </div>
              </div>
            ) : !isMinimized && (
              <>
                {/* Chat Message Stream */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-[#050B14]">
                  
                  {/* Bento style Quick Shortcuts Drawer */}
                  {showQuickMenu && messages.length <= 1 && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-4 shadow-md mb-4 space-y-3"
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 dark:text-orange-400 block mb-1">
                        Atalhos de Apoio Rápido
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => executeQuickAction('services')}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/10 hover:bg-orange-50 dark:hover:bg-orange-950/20 border border-orange-100/50 dark:border-orange-950/30 text-left text-xs font-semibold text-gray-800 dark:text-gray-200 transition-all active:scale-[0.97]"
                        >
                          <Layers size={14} className="text-orange-500 flex-shrink-0" />
                          <span>Ver Serviços</span>
                        </button>
                        <button 
                          onClick={() => executeQuickAction('portfolio')}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/10 hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-blue-100/50 dark:border-blue-950/30 text-left text-xs font-semibold text-gray-800 dark:text-gray-200 transition-all active:scale-[0.97]"
                        >
                          <Briefcase size={14} className="text-blue-500 flex-shrink-0" />
                          <span>Ir para Portfólio</span>
                        </button>
                        <button 
                          onClick={() => executeQuickAction('budget')}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-950/30 text-left text-xs font-semibold text-gray-800 dark:text-gray-200 transition-all active:scale-[0.97]"
                        >
                          <FileText size={14} className="text-emerald-500 flex-shrink-0" />
                          <span>Pedir Orçamento</span>
                        </button>
                        <button 
                          onClick={() => executeQuickAction('my_projects')}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/10 hover:bg-purple-50 dark:hover:bg-purple-950/20 border border-purple-100/50 dark:border-purple-950/30 text-left text-xs font-semibold text-gray-800 dark:text-gray-200 transition-all active:scale-[0.97]"
                        >
                          <Sparkles size={14} className="text-purple-500 flex-shrink-0" />
                          <span>Meus Pedidos</span>
                        </button>
                        <button 
                          onClick={() => executeQuickAction('catalog')}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FFF2CC] dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20 border border-amber-100/50 dark:border-amber-950/30 text-left text-xs font-semibold text-gray-800 dark:text-gray-200 transition-all active:scale-[0.97]"
                        >
                          <PhoneCall size={14} className="text-amber-500 flex-shrink-0" />
                          <span>Catálogo</span>
                        </button>
                        <button 
                          onClick={() => executeQuickAction('contact')}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-100/50 dark:border-rose-950/30 text-left text-xs font-semibold text-gray-800 dark:text-gray-200 transition-all active:scale-[0.97]"
                        >
                          <User size={14} className="text-rose-500 flex-shrink-0" />
                          <span>Especialista</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {messages.map((msg, index) => {
                    const isOwn = (isAdmin && msg.sender_role === 'admin') || (!isAdmin && msg.sender_role === 'user');
                    const isAI = msg.sender_role === 'ai';
                    
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={msg.id ? `msg-${msg.id}` : `idx-${index}`} 
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="max-w-[85%] group relative">
                          <div className={`
                            p-3 shadow-md relative transition-all duration-300
                            ${isOwn ? 
                              'bg-gradient-to-br from-[#E67E22] to-[#D35400] text-white rounded-2xl rounded-tr-none text-sm' : 
                              isAI ? 
                              'bg-white dark:bg-[#111A2E] text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-800 p-3.5 text-sm font-sans' : 
                              'bg-[#F2F4F4] dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-none text-sm'}
                          `}>
                            {msg.status === 'deleted_for_all' ? (
                              <span className="italic opacity-70 flex items-center gap-1.5 text-xs text-gray-400">
                                <Trash2 size={12} /> Mensagem eliminada
                              </span>
                            ) : (
                              <>
                                <div className="whitespace-pre-wrap leading-relaxed space-y-1">
                                  {msg.message}
                                </div>
                                {msg.options && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {msg.options.map((opt, i) => (
                                      <button
                                        key={i}
                                        onClick={() => handleOptionClick(opt)}
                                        className="px-3.5 py-1.5 bg-orange-50 hover:bg-[#FF8C00] text-[#D35400] hover:text-white border border-orange-200 hover:border-transparent rounded-full text-xs transition-all font-semibold active:scale-95 shadow-sm"
                                      >
                                        {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 mt-2 opacity-50 text-[9px] font-medium justify-between">
                                  <span>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {isOwn && (
                                    <span className="flex items-center text-emerald-500 font-bold gap-0.5">
                                      <Eye size={10} /> Lido
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          
                          {/* Individual Message Deletion UI */}
                          {msg.id && msg.status !== 'deleted_for_all' && (
                            <div className={`
                              absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10
                              ${isOwn ? 'right-full mr-2' : 'left-full ml-2'}
                            `}>
                              <button 
                                onClick={() => handleDeleteMessage(msg.id!, 'self')}
                                className="p-1.5 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/20 shadow-md rounded-full text-gray-400 hover:text-red-500 transition-colors border border-gray-100 dark:border-gray-700"
                                title="Eliminar para mim"
                              >
                                <Trash2 size={11} />
                              </button>
                              {isOwn && (
                                <button 
                                  onClick={() => handleDeleteMessage(msg.id!, 'all')}
                                  className="p-1.5 bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 shadow-md rounded-full text-gray-400 hover:text-emerald-500 transition-colors border border-gray-100 dark:border-gray-700"
                                  title="Eliminar para todos"
                                >
                                  <X size={11} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Typing / Loading AI Indicator */}
                  {isLoadingAI && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white dark:bg-[#111A2E] border border-gray-100 dark:border-gray-800 text-gray-500 rounded-2xl rounded-tl-none p-3 shadow-md flex items-center gap-2">
                        <Bot size={16} className="text-orange-500 animate-spin-slow" />
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Persist-state Action Drawer buttons */}
                {messages.length > 1 && (
                  <div className="px-4 py-1.5 bg-gray-100/80 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 flex-shrink-0">
                    <button 
                      onClick={() => setShowQuickMenu(!showQuickMenu)} 
                      className="text-[10px] text-orange-600 dark:text-orange-400 font-bold hover:underline py-1"
                    >
                      {showQuickMenu ? "Ocultar Atalhos" : "Mostrar Atalhos Rápidos"}
                    </button>
                    <button 
                      onClick={() => setMessages([messages[0]])} 
                      className="text-[10px] text-gray-400 hover:text-red-500 font-bold flex items-center gap-1 py-1"
                    >
                      Limpar conversa
                    </button>
                  </div>
                )}

                {/* Sub Quick Menu if toggled */}
                {showQuickMenu && messages.length > 1 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-850 flex gap-2 overflow-x-auto scrollbar-none flex-shrink-0"
                  >
                    <button 
                      onClick={() => executeQuickAction('services')}
                      className="px-3 py-1 bg-orange-50 dark:bg-orange-950/20 text-[#D35400] text-xs font-semibold rounded-full hover:bg-[#FF8C00] hover:text-white border border-orange-100 transition-all flex-shrink-0"
                    >
                      Ver Serviços
                    </button>
                    <button 
                      onClick={() => executeQuickAction('portfolio')}
                      className="px-3 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-700 text-xs font-semibold rounded-full hover:bg-blue-500 hover:text-white border border-blue-100 transition-all flex-shrink-0"
                    >
                      Nossos Projetos
                    </button>
                    <button 
                      onClick={() => executeQuickAction('budget')}
                      className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 text-xs font-semibold rounded-full hover:bg-emerald-500 hover:text-white border border-emerald-100 transition-all flex-shrink-0"
                    >
                      Novo Pedido
                    </button>
                    <button 
                      onClick={() => executeQuickAction('contact')}
                      className="px-3 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-700 text-xs font-semibold rounded-full hover:bg-rose-500 hover:text-white border border-rose-100 transition-all flex-shrink-0"
                    >
                      Suporte Direto
                    </button>
                  </motion.div>
                )}

                {/* Keyboard Input Bar */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-900 bg-white dark:bg-gray-950 rounded-b-3xl flex-shrink-0">
                  <form onSubmit={handleSend} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Fale sobre marcas, logos, apps ou orçamentos..."
                      className="flex-grow p-3 bg-gray-50 dark:bg-[#111A2E] text-sm text-gray-800 dark:text-gray-100 border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-inner placeholder-gray-400"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="p-3 bg-gradient-to-r from-[#FFB347] to-[#FF8C00] text-white rounded-full hover:from-orange-500 hover:to-orange-600 disabled:opacity-40 transition-all shadow-md active:scale-95 flex-shrink-0 flex items-center justify-center cursor-pointer"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                  <div className="mt-2 text-center">
                    <button 
                      onClick={() => {
                        window.location.hash = '/mensagens';
                        setIsOpen(false);
                      }}
                      className="text-[10px] text-gray-400 hover:text-[#FF8C00] transition-all font-semibold inline-flex items-center gap-1"
                    >
                      <ExternalLink size={10} /> Abrir chat em ecrã inteiro
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
