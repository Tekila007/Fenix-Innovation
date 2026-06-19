import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { formatAOA } from '../contexts/CartContext';
import { motion } from 'motion/react';
import { Users, ShoppingBag, DollarSign, Activity, Edit, Trash2, Plus, MessageSquare, X, Star, CheckCircle, AlertCircle, Folder, Tag, Download, FileText, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Stats {
  clients: number;
  orders: number;
  revenue: number;
}

interface ChatMessage {
  id: number;
  order_id: number;
  sender_id: number;
  sender_role: string;
  message: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  created_at: string;
}

interface Client {
  id: number;
  name: string;
  email: string;
  tipo: string;
  telefone: string;
  nif: string;
  bonus?: number;
}

interface Order {
  id: number;
  total: number;
  status: string;
  created_at: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  payment_proof?: string;
  attachment?: string;
  client_message?: string;
  admin_message?: string;
  items: any[];
}

interface Service {
  id: number;
  nome: string;
  preco: number;
  descricao: string;
  categoria: string;
  image: string;
  is_promo?: boolean;
}

interface Message {
  id: number;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

interface Feedback {
  id: number;
  user_name: string;
  service_name: string | null;
  rating: number;
  comment: string;
  approved: number;
  created_at: string;
  work_image: string[] | null;
}

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
  images?: string;
}

interface Coupon {
  id: number;
  code: string;
  discount_percentage: number;
  active: number;
  created_at: string;
  last_message_text?: string;
}

interface GeneralChat {
  session_id: string;
  last_msg: string;
  user_name: string | null;
  user_avatar: string | null;
  last_message_text?: string;
}

interface GeneralChatMessage {
  id: number;
  session_id: string;
  sender_id: number | null;
  sender_role: 'user' | 'admin' | 'ai';
  message: string;
  created_at: string;
}

const Admin = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'dashboard';
  const orderIdFromUrl = searchParams.get('orderId');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [stats, setStats] = useState<Stats>({ clients: 0, orders: 0, revenue: 0 });
  const [chartData, setChartData] = useState({ revenueByMonth: [], ordersByStatus: [] });
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [generalChats, setGeneralChats] = useState<GeneralChat[]>([]);
  const [selectedGeneralChat, setSelectedGeneralChat] = useState<GeneralChat | null>(null);
  const [generalChatMessages, setGeneralChatMessages] = useState<GeneralChatMessage[]>([]);
  const [generalChatInput, setGeneralChatInput] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [selectedClientForBonus, setSelectedClientForBonus] = useState<Client | null>(null);
  const [bonusAmount, setBonusAmount] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newService, setNewService] = useState({
    nome: '',
    preco: '',
    descricao: '',
    categoria: 'Design para Redes Sociais',
    image: '',
    is_promo: false
  });
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [newProject, setNewProject] = useState({
    title: '',
    category: '',
    image: '',
    description: '',
    price: '',
    duration: '',
    delivery_method: '',
    status: '',
    video: '',
    images: ''
  });
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_percentage: '' });
  const [isFeedbackImageModalOpen, setIsFeedbackImageModalOpen] = useState(false);
  const [selectedFeedbackForImage, setSelectedFeedbackForImage] = useState<Feedback | null>(null);
  const [feedbackWorkImages, setFeedbackWorkImages] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAdmin, navigate, activeTab]);

  useEffect(() => {
    if (selectedOrder) {
      fetchChatMessages(selectedOrder.id);
      
      // Socket.IO Real-time subscription for chat messages
      if (!socketRef.current) {
        socketRef.current = io();
      }

      const socket = socketRef.current;
      socket.emit('join', { room: `order_${selectedOrder.id}`, role: 'admin' });

      socket.on('receive_order_message', (newMsg: ChatMessage) => {
        if (newMsg.order_id === selectedOrder.id) {
          setChatMessages((prev) => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
        }
      });

      return () => {
        socket.off('receive_order_message');
      };
    }
  }, [selectedOrder]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const [highlightChat, setHighlightChat] = useState(false);

  useEffect(() => {
    if (orderIdFromUrl && selectedOrder && selectedOrder.id === parseInt(orderIdFromUrl)) {
      setHighlightChat(true);
      const timer = setTimeout(() => setHighlightChat(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [orderIdFromUrl, selectedOrder]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const fetchChatMessages = async (orderId: number) => {
    try {
      const response = await axios.get(`/api/orders/${orderId}/messages`);
      setChatMessages(response.data);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    }
  };

  const fetchData = async () => {
    try {
      if (activeTab === 'dashboard') {
        const resStats = await axios.get('/api/stats');
        setStats(resStats.data);
        const resCharts = await axios.get('/api/stats/charts');
        setChartData(resCharts.data);
      } else if (activeTab === 'clientes') {
        const res = await axios.get('/api/clientes');
        setClients(res.data);
      } else if (activeTab === 'pedidos') {
        const res = await axios.get('/api/pedidos');
        setOrders(res.data);
        
        // If there's an orderId in the URL, select it
        if (orderIdFromUrl) {
          const order = res.data.find((o: Order) => o.id === parseInt(orderIdFromUrl));
          if (order) {
            setSelectedOrder(order);
          }
        }
      } else if (activeTab === 'servicos') {
        const res = await axios.get('/api/services');
        setServices(res.data);
      } else if (activeTab === 'mensagens') {
        const res = await axios.get('/api/mensagens');
        setMessages(res.data);
      } else if (activeTab === 'feedbacks') {
        const res = await axios.get('/api/feedbacks');
        setFeedbacks(res.data);
      } else if (activeTab === 'projetos') {
        const res = await axios.get('/api/projects');
        setProjects(res.data);
      } else if (activeTab === 'cupons') {
        const res = await axios.get('/api/coupons');
        setCoupons(res.data);
      } else if (activeTab === 'chat_geral') {
        const res = await axios.get('/api/admin/chats');
        setGeneralChats(res.data);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  };

  const [adminMessage, setAdminMessage] = useState('');

  const updateOrderStatus = async (id: number, status: string, message?: string) => {
    try {
      await axios.put(`/api/pedidos/${id}/status`, { 
        status,
        admin_message: message 
      });
      fetchData();
      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder({ ...selectedOrder, status, admin_message: message || selectedOrder.admin_message });
      }
      
      if (status === 'Concluído') {
        toast.success('Obrigado por escolher estes serviços');
      } else {
        toast.success('Status do pedido atualizado!');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do pedido.');
    }
  };

  const [fileData, setFileData] = useState<{url: string, name: string, type: string} | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const validTypes = ['image/png', 'image/jpeg', 'application/pdf', 'image/tiff', 'image/vnd.adobe.photoshop'];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.psd')) {
        toast.error('Formato inválido. Use PNG, JPG, PDF, TIFF ou PSD.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileData({
          url: reader.result as string,
          name: file.name,
          type: file.type || (file.name.endsWith('.psd') ? 'image/vnd.adobe.photoshop' : 'unknown')
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendAdminMessage = async () => {
    if (!selectedOrder || (!adminMessage.trim() && !fileData)) return;
    try {
      await axios.post(`/api/orders/${selectedOrder.id}/messages`, {
        message: adminMessage,
        file_url: fileData?.url,
        file_name: fileData?.name,
        file_type: fileData?.type
      });
      setAdminMessage('');
      setFileData(null);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem.');
    }
  };

  const deleteService = async (id: number) => {
    if (window.confirm('Tem certeza que deseja remover este serviço?')) {
      try {
        await axios.delete(`/api/services/${id}`);
        fetchData();
        toast.success('Serviço removido com sucesso!');
      } catch (error) {
        console.error('Erro ao remover serviço:', error);
        toast.error('Erro ao remover serviço.');
      }
    }
  };

  const handleToggleFeedbackApproval = async (id: number, currentStatus: number) => {
    try {
      await axios.put(`/api/feedbacks/${id}/approve`, { approved: !currentStatus });
      fetchData();
      toast.success('Status da avaliação atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar avaliação');
    }
  };

  const handleUpdateFeedbackImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedbackForImage) return;

    try {
      await axios.put(`/api/feedbacks/${selectedFeedbackForImage.id}/image`, { work_image: feedbackWorkImages });
      toast.success('Imagens do trabalho atualizadas!');
      setIsFeedbackImageModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar imagem:', error);
      toast.error('Erro ao atualizar imagem.');
    }
  };

  const handleFeedbackImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const remainingSlots = 5 - feedbackWorkImages.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      if (filesToProcess.length === 0) {
        toast.error('Limite de 5 imagens atingido');
        return;
      }

      filesToProcess.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`A imagem ${file.name} deve ter no máximo 10MB`);
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setFeedbackWorkImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFeedbackImage = (index: number) => {
    setFeedbackWorkImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingServiceId) {
        await axios.put(`/api/services/${editingServiceId}`, {
          ...newService,
          preco: parseFloat(newService.preco)
        });
        toast.success('Serviço atualizado com sucesso!');
      } else {
        await axios.post('/api/services', {
          ...newService,
          preco: parseFloat(newService.preco)
        });
        toast.success('Serviço adicionado com sucesso!');
      }
      setIsAddServiceModalOpen(false);
      setEditingServiceId(null);
      setNewService({ nome: '', preco: '', descricao: '', categoria: 'Design para Redes Sociais', image: '', is_promo: false });
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      toast.error('Erro ao salvar serviço. Verifique os dados e tente novamente.');
    }
  };

  const openEditServiceModal = (service: Service) => {
    setNewService({
      nome: service.nome,
      preco: service.preco.toString(),
      descricao: service.descricao,
      categoria: service.categoria,
      image: service.image || '',
      is_promo: !!service.is_promo
    });
    setEditingServiceId(service.id);
    setIsAddServiceModalOpen(true);
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProjectId) {
        await axios.put(`/api/projects/${editingProjectId}`, newProject);
        toast.success('Projeto atualizado com sucesso!');
      } else {
        await axios.post('/api/projects', newProject);
        toast.success('Projeto adicionado com sucesso!');
      }
      setIsProjectModalOpen(false);
      setEditingProjectId(null);
      setNewProject({
        title: '',
        category: '',
        image: '',
        description: '',
        price: '',
        duration: '',
        delivery_method: '',
        status: '',
        video: '',
        images: ''
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar projeto:', error);
      toast.error('Erro ao salvar projeto.');
    }
  };

  const openEditProjectModal = (project: Project) => {
    setNewProject({
      title: project.title,
      category: project.category,
      image: project.image,
      description: project.description,
      price: project.price || '',
      duration: project.duration || '',
      delivery_method: project.delivery_method || '',
      status: project.status || '',
      video: project.video || '',
      images: project.images || ''
    });
    setEditingProjectId(project.id);
    setIsProjectModalOpen(true);
  };

  const handleResetData = async (type: string) => {
    if (!window.confirm(`Tem certeza que deseja apagar ${type === 'all' ? 'TODOS os dados' : 'estes dados'}? Esta ação não pode ser desfeita.`)) return;
    
    try {
      await axios.post('/api/reset-data', { type });
      toast.success('Dados apagados com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Erro ao apagar dados:', error);
      toast.error('Erro ao apagar dados.');
    }
  };

  const generatePDF = (order: Order) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(255, 140, 0); // Fenix Orange
    doc.text('Fênix Innovation', 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text('Recibo do Pedido', 14, 30);
    
    // Order Info
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text(`Pedido Nº: #${order.id}`, 14, 45);
    doc.text(`Cliente: ${order.client_name} (${order.client_email})`, 14, 52);
    doc.text(`Data: ${new Date(order.created_at).toLocaleDateString('pt-BR')}`, 14, 59);
    doc.text(`Status: ${order.status}`, 14, 66);
    
    // Items Table
    const tableColumn = ["Serviço", "Quantidade", "Preço Unitário", "Subtotal"];
    const tableRows: any[] = [];
    
    order.items.forEach(item => {
      const rowData = [
        item.nome,
        item.quantidade.toString(),
        new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(item.preco),
        new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(item.preco * item.quantidade)
      ];
      tableRows.push(rowData);
    });
    
    (doc as any).autoTable({
      startY: 75,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [255, 140, 0] },
    });
    
    // Total
    const finalY = (doc as any).lastAutoTable.finalY || 75;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total: ${new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(order.total)}`, 14, finalY + 15);
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Obrigado por escolher a Fênix Innovation!', 14, finalY + 35);
    
    doc.save(`Fenix_Recibo_Pedido_${order.id}.pdf`);
  };

  const handleGiveBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForBonus) return;
    try {
      await axios.put(`/api/clientes/${selectedClientForBonus.id}/bonus`, {
        bonus: parseFloat(bonusAmount)
      });
      setIsBonusModalOpen(false);
      setSelectedClientForBonus(null);
      setBonusAmount('');
      fetchData();
      toast.success('Bônus concedido com sucesso!');
    } catch (error) {
      console.error('Erro ao dar bônus:', error);
      toast.error('Erro ao dar bônus. Verifique os dados e tente novamente.');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/coupons', { 
        code: newCoupon.code, 
        discount_percentage: parseFloat(newCoupon.discount_percentage) 
      });
      toast.success('Cupom criado com sucesso!');
      setIsCouponModalOpen(false);
      setNewCoupon({ code: '', discount_percentage: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao criar cupom.');
    }
  };

  const toggleFeedbackApproval = async (id: number, currentStatus: number) => {
    try {
      await axios.put(`/api/feedbacks/${id}/approve`, { approved: !currentStatus });
      fetchData();
      toast.success('Status do feedback atualizado!');
    } catch (error) {
      console.error('Erro ao atualizar feedback:', error);
      toast.error('Erro ao atualizar feedback.');
    }
  };

  const deleteFeedback = async (id: number) => {
    if (window.confirm('Tem certeza que deseja remover este feedback?')) {
      try {
        await axios.delete(`/api/feedbacks/${id}`);
        fetchData();
        toast.success('Feedback removido com sucesso!');
      } catch (error) {
        console.error('Erro ao remover feedback:', error);
        toast.error('Erro ao remover feedback.');
      }
    }
  };

  const GeneralChatSection = () => {
    const [chats, setChats] = useState<GeneralChat[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const socketRef = useRef<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      fetchChats();
      socketRef.current = io();
      socketRef.current.emit('join', { role: 'admin', room: 'general' });

      socketRef.current.on('receive_message', (data: any) => {
        if (data.session_id === selectedChat) {
          setMessages((prev) => {
            const isDuplicate = prev.some(m => 
              (m.id && m.id === data.id) || 
              (m.message === data.message && m.sender_role === data.sender_role && m.created_at === data.created_at)
            );
            if (isDuplicate) return prev;
            return [...prev, data];
          });
        }
        fetchChats(); // Refresh list to show latest message
      });

      socketRef.current.on('admin_status', (data: any) => {
        // Just to handle the event if needed
      });

      return () => {
        if (socketRef.current) socketRef.current.disconnect();
      };
    }, [selectedChat]);

    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [messages]);

    const fetchChats = async () => {
      try {
        const res = await axios.get('/api/admin/chats');
        setChats(res.data);
      } catch (error) {
        console.error('Error fetching chats:', error);
      }
    };

    const fetchMessages = async (sessionId: string) => {
      try {
        const res = await axios.get(`/api/chat/history/${sessionId}`);
        setMessages(res.data);
        setSelectedChat(sessionId);
        socketRef.current.emit('join', { role: 'admin', room: sessionId });
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    const handleSendMessage = () => {
      if (!newMessage.trim() || !selectedChat) return;
      const data = {
        session_id: selectedChat,
        sender_role: 'admin',
        message: newMessage,
        room: selectedChat
      };
      socketRef.current.emit('send_message', data);
      setNewMessage('');
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[600px]">
        <div className="md:col-span-1 border-r border-gray-200 dark:border-gray-700 overflow-y-auto pr-4">
          <h3 className="font-bold mb-4 text-gray-900 dark:text-white">Conversas Ativas</h3>
          <div className="space-y-2">
            {chats.map((chat) => (
              <button
                key={chat.session_id}
                onClick={() => fetchMessages(chat.session_id)}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  selectedChat === chat.session_id
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <p className="text-xs font-mono truncate">{chat.session_id}</p>
                <p className="text-[10px] opacity-60">{new Date(chat.last_msg).toLocaleString()}</p>
              </button>
            ))}
            {chats.length === 0 && <p className="text-sm text-gray-500 italic">Nenhuma conversa.</p>}
          </div>
        </div>
        <div className="md:col-span-3 flex flex-col h-full">
          {selectedChat ? (
            <>
              <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl mb-4" ref={scrollRef}>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl ${
                      msg.sender_role === 'admin' 
                        ? 'bg-[#FF8C00] text-white rounded-tr-none' 
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-tl-none'
                    }`}>
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-[10px] mt-1 opacity-60 text-right">
                        {new Date(msg.created_at || Date.now()).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Digite sua resposta..."
                  className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2 bg-[#FF8C00] text-white rounded-xl hover:bg-orange-600"
                >
                  <MessageSquare className="w-6 h-6" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-grow flex items-center justify-center text-gray-500 italic">
              Selecione uma conversa para começar
            </div>
          )}
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: <Activity className="w-5 h-5" /> },
    { id: 'clientes', name: 'Clientes', icon: <Users className="w-5 h-5" /> },
    { id: 'pedidos', name: 'Pedidos', icon: <ShoppingBag className="w-5 h-5" /> },
    { id: 'servicos', name: 'Serviços', icon: <DollarSign className="w-5 h-5" /> },
    { id: 'mensagens', name: 'Mensagens', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'feedbacks', name: 'Feedbacks', icon: <Star className="w-5 h-5" /> },
    { id: 'projetos', name: 'Projetos', icon: <Folder className="w-5 h-5" /> },
    { id: 'cupons', name: 'Cupons', icon: <Tag className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-20 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-extrabold text-gray-900 dark:text-white mb-8"
        >
          Painel Administrativo
        </motion.h1>

        {/* Tabs */}
        <div className="flex space-x-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              initial="initial"
              whileHover="hover"
              whileTap={{ scale: 0.95 }}
              layout
              className={`group flex items-center px-4 py-3 rounded-xl font-bold transition-all duration-200 relative hover:z-10 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#fec24e] to-[#FF8C00] text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <motion.div 
                className="flex items-center"
                variants={{
                  initial: { scale: 1 },
                  hover: { scale: 1.1 }
                }}
              >
                {tab.icon}
                <motion.span
                  variants={{
                    initial: { width: 0, opacity: 0, marginLeft: 0 },
                    hover: { width: 'auto', opacity: 1, marginLeft: 8 }
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden whitespace-nowrap text-sm"
                >
                  {tab.name}
                </motion.span>
              </motion.div>
              
              {/* Tooltip fallback for mobile */}
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity md:hidden">
                {tab.name}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8"
        >
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                  <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">Total Clientes</h3>
                  <p className="text-4xl font-extrabold text-blue-900 dark:text-blue-100">{stats.clients}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-2xl border border-orange-100 dark:border-orange-800/30">
                  <h3 className="text-lg font-bold text-orange-800 dark:text-orange-300 mb-2">Total Pedidos</h3>
                  <p className="text-4xl font-extrabold text-orange-900 dark:text-orange-100">{stats.orders}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border border-green-100 dark:border-green-800/30">
                  <h3 className="text-lg font-bold text-green-800 dark:text-green-300 mb-2">Faturamento</h3>
                  <p className="text-4xl font-extrabold text-green-900 dark:text-green-100">{formatAOA(stats.revenue)}</p>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Faturamento Mensal (Concluídos)</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.revenueByMonth}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} tickFormatter={(value) => `Kz ${value / 1000}k`} />
                        <Tooltip 
                          formatter={(value: number) => [formatAOA(value), 'Faturamento']}
                          cursor={{ fill: 'rgba(255, 140, 0, 0.1)' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        />
                        <Bar dataKey="total" fill="#FF8C00" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Status dos Pedidos</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.ordersByStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.ordersByStatus.map((entry: any, index: number) => {
                            const colors: Record<string, string> = {
                              'Pendente': '#f59e0b',
                              'Aguardando Verificação': '#3b82f6',
                              'Em Andamento': '#8b5cf6',
                              'Concluído': '#10b981'
                            };
                            return <Cell key={`cell-${index}`} fill={colors[entry.name] || '#9ca3af'} />;
                          })}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [value, 'Pedidos']}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl border border-red-100 dark:border-red-900/30">
                <h3 className="text-lg font-bold text-red-800 dark:text-red-400 mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" /> Zona de Perigo
                </h3>
                <p className="text-sm text-red-600 dark:text-red-300 mb-4">
                  Atenção: As ações abaixo são irreversíveis e apagarão os dados permanentemente.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => handleResetData('orders')} className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg text-sm font-medium transition-colors">
                    Apagar Pedidos
                  </button>
                  <button onClick={() => handleResetData('messages')} className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg text-sm font-medium transition-colors">
                    Apagar Mensagens
                  </button>
                  <button onClick={() => handleResetData('feedbacks')} className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg text-sm font-medium transition-colors">
                    Apagar Feedbacks
                  </button>
                  <button onClick={() => handleResetData('all')} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-bold transition-colors shadow-sm">
                    Apagar TODOS os Dados
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clientes' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Telefone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bônus</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {clients.map((client, idx) => (
                    <tr key={`client-${client.id || idx}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{client.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{client.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">{client.tipo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{client.telefone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 dark:text-green-400">{formatAOA(client.bonus || 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => {
                            setSelectedClientForBonus(client);
                            setBonusAmount((client.bonus || 0).toString());
                            setIsBonusModalOpen(true);
                          }}
                          className="text-[#FF8C00] hover:text-orange-600 dark:hover:text-orange-400 flex items-center justify-end w-full"
                        >
                          <DollarSign className="w-4 h-4 mr-1" /> Dar Bônus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'pedidos' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {orders.map((order, idx) => (
                    <tr key={`order-${order.id || idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors" onClick={() => setSelectedOrder(order)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">#{order.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{order.client_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatAOA(order.total)}</td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === 'Concluído' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          order.status === 'Em andamento' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-[#FF8C00] focus:border-[#FF8C00] sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="Pendente">Pendente</option>
                          <option value="Em andamento">Em andamento</option>
                          <option value="Concluído">Concluído</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'servicos' && (
            <div>
              <div className="flex justify-end mb-4">
                <button 
                  onClick={() => setIsAddServiceModalOpen(true)}
                  className="flex items-center px-4 py-2 bg-[#FF8C00] text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" /> Novo Serviço
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categoria</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Preço</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {services.map((service, idx) => (
                      <tr key={`service-${service.id || idx}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {service.nome}
                          {service.is_promo ? (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                              Promo
                            </span>
                          ) : null}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{service.categoria}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatAOA(service.preco)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => openEditServiceModal(service)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4">
                            <Edit className="w-5 h-5" />
                          </button>
                          <button onClick={() => deleteService(service.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'mensagens' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Mensagens de Contato</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mensagem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {messages.map((msg, idx) => (
                      <tr key={`msg-${msg.id || idx}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(msg.created_at).toLocaleDateString('pt-PT')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{msg.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{msg.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{msg.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'feedbacks' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Avaliações de Clientes</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trabalho</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avaliação</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Comentário</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {feedbacks.map((feedback, idx) => (
                      <tr key={`feedback-${feedback.id || idx}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(feedback.created_at).toLocaleDateString('pt-PT')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{feedback.user_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {feedback.work_image && feedback.work_image.length > 0 ? (
                            <div className="flex -space-x-2 overflow-hidden">
                              {feedback.work_image.slice(0, 3).map((img, i) => (
                                <img 
                                  key={i} 
                                  src={img} 
                                  alt="Trabalho" 
                                  className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800 object-cover" 
                                />
                              ))}
                              {feedback.work_image.length > 3 && (
                                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 text-[10px] font-bold ring-2 ring-white dark:ring-gray-800">
                                  +{feedback.work_image.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Sem imagem</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < feedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'}`} />
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{feedback.comment}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${feedback.approved ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                            {feedback.approved ? 'Público' : 'Oculto'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex flex-col items-end space-y-2">
                            <button
                              onClick={() => handleToggleFeedbackApproval(feedback.id, feedback.approved)}
                              className={`text-sm font-medium ${feedback.approved ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300' : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'}`}
                            >
                              {feedback.approved ? 'Ocultar' : 'Publicar'}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedFeedbackForImage(feedback);
                                setFeedbackWorkImages(feedback.work_image || []);
                                setIsFeedbackImageModalOpen(true);
                              }}
                              className="text-sm font-medium text-[#FF8C00] hover:text-orange-700"
                            >
                              Editar Imagens
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'projetos' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Projetos do Portfólio</h2>
                <button 
                  onClick={() => {
                    setEditingProjectId(null);
                    setNewProject({
                      title: '',
                      category: '',
                      image: '',
                      description: '',
                      price: '',
                      duration: '',
                      delivery_method: '',
                      status: '',
                      video: '',
                      images: ''
                    });
                    setIsProjectModalOpen(true);
                  }}
                  className="flex items-center px-4 py-2 bg-[#FF8C00] text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" /> Novo Projeto
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project, idx) => (
                  <div key={`project-${project.id || idx}`} className="bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img src={project.image} alt={project.title} className="w-full h-48 object-cover" />
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{project.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{project.category}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{project.description}</p>
                      <div className="mt-4 flex justify-end space-x-2">
                        <button onClick={() => openEditProjectModal(project)} className="text-blue-500 hover:text-blue-700">
                          <Edit className="w-5 h-5" />
                        </button>
                        <button onClick={() => {
                          if (window.confirm('Tem certeza que deseja remover este projeto?')) {
                            axios.delete(`/api/projects/${project.id}`).then(() => {
                              toast.success('Projeto removido!');
                              fetchData();
                            });
                          }
                        }} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'cupons' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cupons de Desconto</h2>
                <button 
                  onClick={() => setIsCouponModalOpen(true)}
                  className="flex items-center px-4 py-2 bg-[#FF8C00] text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" /> Novo Cupom
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Código</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Desconto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {coupons.map((coupon, idx) => (
                      <tr key={`coupon-${coupon.id || idx}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{coupon.code}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{coupon.discount_percentage}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => {
                              axios.put(`/api/coupons/${coupon.id}`, { active: !coupon.active }).then(() => fetchData());
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold ${coupon.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {coupon.active ? 'Ativo' : 'Inativo'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => {
                            if (window.confirm('Tem certeza que deseja remover este cupom?')) {
                              axios.delete(`/api/coupons/${coupon.id}`).then(() => {
                                toast.success('Cupom removido!');
                                fetchData();
                              });
                            }
                          }} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'chat_geral' && (
            <GeneralChatSection />
          )}
        </motion.div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Detalhes do Pedido #{selectedOrder.id}</h2>
                <button
                  onClick={() => generatePDF(selectedOrder)}
                  className="flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </button>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Visual Timeline */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Progresso do Pedido</h3>
                <div className="relative">
                  {(() => {
                    const orderStatuses = ['Pendente', 'Aguardando Verificação', 'Em Andamento', 'Concluído'];
                    const currentStatusIndex = orderStatuses.indexOf(selectedOrder.status);
                    return (
                      <>
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700">
                          <div style={{ width: `${(currentStatusIndex / (orderStatuses.length - 1)) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#FF8C00] transition-all duration-500"></div>
                        </div>
                        <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                          {orderStatuses.map((status, index) => (
                            <div key={status} className={`text-center w-1/4 ${index <= currentStatusIndex ? 'text-[#FF8C00] font-bold' : ''}`}>
                              {status}
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cliente</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedOrder.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">{selectedOrder.client_email}</p>
                    <a href={`mailto:${selectedOrder.client_email}`} className="text-[#FF8C00] hover:text-orange-600" title="Enviar Email">
                      <MessageSquare className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Telefone</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">{selectedOrder.client_phone || 'N/A'}</p>
                    {selectedOrder.client_phone && (
                      <a href={`https://wa.me/${selectedOrder.client_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-600" title="Enviar WhatsApp">
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Data</p>
                  <p className="font-medium text-gray-900 dark:text-white">{new Date(selectedOrder.created_at).toLocaleString('pt-PT')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-[#FF8C00] focus:border-[#FF8C00] sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Aguardando Verificação">Aguardando Verificação</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Concluído">Concluído</option>
                  </select>
                </div>
              </div>

              {/* Uploads Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedOrder.payment_proof && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Comprovativo de Pagamento</p>
                    <a href={selectedOrder.payment_proof} target="_blank" rel="noopener noreferrer" className="text-[#FF8C00] hover:underline text-sm flex items-center">
                      Ver Comprovativo
                    </a>
                  </div>
                )}
                {selectedOrder.attachment && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Anexo do Cliente</p>
                    <a href={selectedOrder.attachment} target="_blank" rel="noopener noreferrer" className="text-[#FF8C00] hover:underline text-sm flex items-center">
                      Ver Anexo
                    </a>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Serviços Contratados</h3>
                <div className="space-y-3">
                  {selectedOrder.items && selectedOrder.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.nome}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Qtd: {item.quantidade}</p>
                      </div>
                      <p className="font-bold text-gray-900 dark:text-white">{formatAOA(item.preco * item.quantidade)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900 dark:text-white">Total do Pedido</span>
                <span className="text-2xl font-extrabold text-[#FF8C00]">{formatAOA(selectedOrder.total)}</span>
              </div>

              {/* Messages Section */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Mensagens</h3>
                <div className={`space-y-4 mb-4 max-h-96 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border transition-all duration-500 ${highlightChat ? 'border-[#FF8C00] ring-2 ring-[#FF8C00]/20 shadow-lg shadow-[#FF8C00]/10' : 'border-gray-200 dark:border-gray-700'}`}>
                  {chatMessages.map((msg, idx) => (
                    <div key={`chatmsg-${msg.id || idx}`} className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-4 rounded-2xl max-w-[80%] ${msg.sender_role === 'admin' ? 'bg-[#FF8C00] text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-tl-none'}`}>
                        {msg.sender_role !== 'admin' && <p className="text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">Cliente</p>}
                        {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                        {msg.file_url && (
                          <div className="mt-2">
                            {msg.file_type?.startsWith('image/') ? (
                              <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                                <img src={msg.file_url} alt="Anexo" className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700" style={{ maxHeight: '200px' }} />
                              </a>
                            ) : (
                              <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-lg text-sm ${msg.sender_role === 'admin' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'}`}>
                                <FileText className="w-4 h-4" />
                                <span className="truncate max-w-[200px]">{msg.file_name || 'Anexo'}</span>
                                <Download className="w-4 h-4 ml-auto" />
                              </a>
                            )}
                          </div>
                        )}
                        <p className={`text-[10px] mt-1 text-right ${msg.sender_role === 'admin' ? 'text-orange-200' : 'text-gray-400 dark:text-gray-500'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">Nenhuma mensagem.</p>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={adminMessage}
                    onChange={(e) => setAdminMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendAdminMessage()}
                    placeholder="Enviar mensagem ao cliente..."
                    className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <label className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".png,.jpg,.jpeg,.pdf,.tiff,.psd" />
                  </label>
                  <button
                    onClick={handleSendAdminMessage}
                    disabled={!adminMessage.trim() && !fileData}
                    className="px-4 py-2 bg-[#FF8C00] text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
                </div>
                {fileData && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {fileData.name}
                    <button onClick={() => setFileData(null)} className="text-red-500 hover:text-red-700 ml-2">Remover</button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* Add Service Modal */}
      {isAddServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Adicionar Novo Serviço</h2>
              <button onClick={() => setIsAddServiceModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddService} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Serviço</label>
                <input
                  type="text"
                  required
                  value={newService.nome}
                  onChange={(e) => setNewService({ ...newService, nome: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preço (AOA)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={newService.preco}
                  onChange={(e) => setNewService({ ...newService, preco: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
                <select
                  value={newService.categoria}
                  onChange={(e) => setNewService({ ...newService, categoria: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Design para Redes Sociais">Design para Redes Sociais</option>
                  <option value="Design para Impressão">Design para Impressão</option>
                  <option value="Motion Design">Motion Design</option>
                  <option value="Web Design">Web Design</option>
                  <option value="Direção de Arte">Direção de Arte</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL da Imagem</label>
                <input
                  type="url"
                  value={newService.image}
                  onChange={(e) => setNewService({ ...newService, image: e.target.value })}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                <textarea
                  required
                  rows={3}
                  value={newService.descricao}
                  onChange={(e) => setNewService({ ...newService, descricao: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                ></textarea>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_promo"
                  checked={newService.is_promo}
                  onChange={(e) => setNewService({ ...newService, is_promo: e.target.checked })}
                  className="h-4 w-4 text-[#FF8C00] focus:ring-[#FF8C00] border-gray-300 rounded"
                />
                <label htmlFor="is_promo" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Destacar como Promoção
                </label>
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-[#fec24e] to-[#FF8C00] hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Salvar Serviço
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add/Edit Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingProjectId ? 'Editar Projeto' : 'Adicionar Novo Projeto'}</h2>
              <button onClick={() => setIsProjectModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddProject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título do Projeto</label>
                <input
                  type="text"
                  required
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
                <input
                  type="text"
                  required
                  value={newProject.category}
                  onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL da Imagem</label>
                <input
                  type="url"
                  required
                  value={newProject.image}
                  onChange={(e) => setNewProject({ ...newProject, image: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                <textarea
                  required
                  rows={3}
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Faixa de Preço</label>
                  <input
                    type="text"
                    placeholder="Ex: 30.000 Kz - 100.000 Kz"
                    value={newProject.price}
                    onChange={(e) => setNewProject({ ...newProject, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Prazo de Entrega</label>
                  <select
                    value={newProject.duration}
                    onChange={(e) => setNewProject({ ...newProject, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                  >
                    <option value="">Selecione...</option>
                    <option value="1 dia">1 dia</option>
                    <option value="3 dias">3 dias</option>
                    <option value="7 dias">7 dias</option>
                    <option value="15 dias">15 dias</option>
                    <option value="Personalizado">Personalizado</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Método de Entrega</label>
                  <select
                    value={newProject.delivery_method}
                    onChange={(e) => setNewProject({ ...newProject, delivery_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                  >
                    <option value="">Selecione...</option>
                    <option value="Google Drive">Google Drive</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="E-mail">E-mail</option>
                    <option value="Link para download">Link para download</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-750 dark:text-gray-300 mb-1">Status do Serviço</label>
                  <select
                    value={newProject.status}
                    onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                  >
                    <option value="">Selecione...</option>
                    <option value="Disponível">Disponível</option>
                    <option value="Em promoção">Em promoção</option>
                    <option value="Mais solicitado">Mais solicitado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">URL do Vídeo (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: /uploads/projects/MOTION.mp4"
                  value={newProject.video}
                  onChange={(e) => setNewProject({ ...newProject, video: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Galeria de Imagens JSON (Opcional)</label>
                <input
                  type="text"
                  placeholder='Ex: ["/img1.jpg", "/img2.jpg"]'
                  value={newProject.images}
                  onChange={(e) => setNewProject({ ...newProject, images: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-mono"
                />
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-[#fec24e] to-[#FF8C00] hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  {editingProjectId ? 'Salvar Alterações' : 'Adicionar Projeto'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Give Bonus Modal */}
      {isBonusModalOpen && selectedClientForBonus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-md w-full"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-3xl">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dar Bônus</h2>
              <button onClick={() => setIsBonusModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleGiveBonus} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Defina o valor do bônus para o cliente <strong className="text-gray-900 dark:text-white">{selectedClientForBonus.name}</strong>.
                </p>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor do Bônus (AOA)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-green-400 to-green-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Confirmar Bônus
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* New Coupon Modal */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-md w-full"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-3xl">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Cupom</h2>
              <button onClick={() => setIsCouponModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateCoupon} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código do Cupom</label>
                <input
                  type="text"
                  required
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ex: FENIX10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Porcentagem de Desconto (%)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={newCoupon.discount_percentage}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discount_percentage: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ex: 10"
                />
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-[#fec24e] to-[#FF8C00] hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Criar Cupom
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Feedback Image Modal */}
      {isFeedbackImageModalOpen && selectedFeedbackForImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-md w-full"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-3xl">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Editar Imagens do Trabalho</h2>
              <button onClick={() => setIsFeedbackImageModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateFeedbackImage} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Adicione até 5 imagens do trabalho realizado para o feedback de <strong className="text-gray-900 dark:text-white">{selectedFeedbackForImage.user_name}</strong>.
                </p>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {feedbackWorkImages.map((img, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img src={img} alt={`Preview ${index}`} className="w-full h-full object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                      <button
                        type="button"
                        onClick={() => removeFeedbackImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {feedbackWorkImages.length < 5 && (
                    <label className="flex flex-col items-center justify-center aspect-square border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:border-[#FF8C00] cursor-pointer transition-colors">
                      <Star className="w-6 h-6 text-gray-400" />
                      <span className="text-[10px] text-gray-500 mt-1">Adicionar</span>
                      <input type="file" className="sr-only" accept="image/*" multiple onChange={handleFeedbackImageUpload} />
                    </label>
                  )}
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-[#fec24e] to-[#FF8C00] hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Salvar Imagens
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Admin;
