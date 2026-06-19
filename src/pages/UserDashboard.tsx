import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Package, Clock, CheckCircle, Upload, MessageSquare, AlertCircle, FileText, Star, Download, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface OrderItem {
  nome: string;
  quantidade: number;
  preco: number;
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

interface Order {
  id: number;
  total: number;
  status: string;
  created_at: string;
  payment_proof: string | null;
  attachment: string | null;
  client_message: string | null;
  admin_message: string | null;
  has_reviewed?: boolean;
  items: OrderItem[];
}

const UserDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('orderId');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const ORDERS_PER_PAGE = 5;
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (token) {
      setPage(0);
      setOrders([]);
      setHasMore(true);
      fetchOrders(0);
    }
  }, [token]);

  useEffect(() => {
    if (selectedOrder) {
      fetchChatMessages(selectedOrder.id);
      
      // Socket.IO Real-time subscription for chat messages
      if (!socketRef.current) {
        socketRef.current = io();
      }

      const socket = socketRef.current;
      socket.emit('join', { room: `order_${selectedOrder.id}`, role: user?.role });

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
  }, [selectedOrder, user?.role]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const fetchChatMessages = async (orderId: number) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setChatMessages(data);
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    }
  };

  const [highlightChat, setHighlightChat] = useState(false);

  useEffect(() => {
    if (orderIdFromUrl && selectedOrder && selectedOrder.id === parseInt(orderIdFromUrl)) {
      setHighlightChat(true);
      const timer = setTimeout(() => setHighlightChat(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [orderIdFromUrl, selectedOrder]);

  const fetchOrders = async (pageNum: number) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const response = await fetch(`/api/meus-pedidos?limit=${ORDERS_PER_PAGE}&offset=${pageNum * ORDERS_PER_PAGE}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.length < ORDERS_PER_PAGE) {
          setHasMore(false);
        }
        
        if (pageNum === 0) {
          setOrders(data);
          // If there's an orderId in the URL, select it
          if (orderIdFromUrl) {
            const order = data.find((o: Order) => o.id === parseInt(orderIdFromUrl));
            if (order) {
              setSelectedOrder(order);
            }
          }
        } else {
          setOrders(prev => [...prev, ...data]);
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreOrders = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchOrders(nextPage);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'payment_proof' | 'attachment') => {
    if (!e.target.files || !e.target.files[0] || !selectedOrder) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      setUploading(true);
      try {
        const response = await fetch(`/api/meus-pedidos/${selectedOrder.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            [type]: reader.result
          })
        });

        if (response.ok) {
          toast.success(type === 'payment_proof' ? 'Comprovativo enviado com sucesso!' : 'Anexo enviado com sucesso!');
          fetchOrders(0);
          setSelectedOrder(prev => prev ? { ...prev, [type]: reader.result as string } : null);
        } else {
          toast.error('Erro ao enviar arquivo');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error('Erro ao enviar arquivo');
      } finally {
        setUploading(false);
      }
    };
    
    reader.readAsDataURL(file);
  };

  const [fileData, setFileData] = useState<{url: string, name: string, type: string} | null>(null);

  const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleDeleteOrder = async (orderId: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este pedido?')) return;
    try {
      await axios.delete(`/api/pedidos/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Pedido excluído com sucesso!');
      setOrders(orders.filter(o => o.id !== orderId));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      toast.error('Erro ao excluir pedido. Apenas pedidos pendentes podem ser excluídos.');
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !fileData) return;
    if (!selectedOrder) return;

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: message,
          file_url: fileData?.url,
          file_name: fileData?.name,
          file_type: fileData?.type
        })
      });

      if (response.ok) {
        setMessage('');
        setFileData(null);
      } else {
        toast.error('Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedOrder) return;
    setSubmittingReview(true);
    try {
      const response = await fetch(`/api/pedidos/${selectedOrder.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, comment: reviewComment, work_image: reviewImages })
      });

      if (response.ok) {
        toast.success('Avaliação enviada com sucesso!');
        fetchOrders(0);
        setSelectedOrder(prev => prev ? { ...prev, has_reviewed: true } : null);
        setReviewImages([]);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao enviar avaliação');
      }
    } catch (error) {
      toast.error('Erro ao enviar avaliação');
    } finally {
      setSubmittingReview(false);
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
    doc.text(`Data: ${new Date(order.created_at).toLocaleDateString('pt-BR')}`, 14, 52);
    doc.text(`Status: ${order.status}`, 14, 59);
    
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
      startY: 70,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [255, 140, 0] },
    });
    
    // Total
    const finalY = (doc as any).lastAutoTable.finalY || 70;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total: ${new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(order.total)}`, 14, finalY + 15);
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Obrigado por escolher a Fênix Innovation!', 14, finalY + 35);
    
    doc.save(`Fenix_Recibo_Pedido_${order.id}.pdf`);
  };

  if (!user) {
    return <Navigate to="/cadastro" />;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendente': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'Aguardando Verificação': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Em Andamento': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'Concluído': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pendente': return <Clock className="w-5 h-5" />;
      case 'Aguardando Verificação': return <AlertCircle className="w-5 h-5" />;
      case 'Em Andamento': return <Package className="w-5 h-5" />;
      case 'Concluído': return <CheckCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meus Pedidos</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Acompanhe o status dos seus serviços</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Orders List */}
          <div 
            className="lg:col-span-1 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar"
            onScroll={(e) => {
              const target = e.currentTarget;
              if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
                loadMoreOrders();
              }
            }}
          >
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : orders.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-700">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhum pedido</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Você ainda não fez nenhum pedido.</p>
              </div>
            ) : (
              <>
                {orders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setSelectedOrder(order)}
                    className={`bg-white dark:bg-gray-800 rounded-2xl p-6 cursor-pointer transition-all duration-200 border ${
                      selectedOrder?.id === order.id 
                        ? 'border-[#FF8C00] shadow-md' 
                        : 'border-gray-100 dark:border-gray-700 hover:border-[#FF8C00]/50 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Pedido #{order.id}
                        </span>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1.5">{order.status}</span>
                      </span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(order.total)}
                    </div>
                    {order.status === 'Concluído' && (
                      <div className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                        Obrigado por escolher estes serviços
                      </div>
                    )}
                  </motion.div>
                ))}
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF8C00]"></div>
                  </div>
                )}
                {!hasMore && orders.length > 0 && (
                  <p className="text-center text-gray-500 text-sm py-4">Você chegou ao fim da lista.</p>
                )}
              </>
            )}
          </div>

          {/* Order Details */}
          <div className="lg:col-span-2">
            {selectedOrder ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-100 dark:border-gray-700">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Detalhes do Pedido #{selectedOrder.id}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      Feito em {new Date(selectedOrder.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {selectedOrder.status === 'Pendente' && (
                      <button
                        onClick={() => handleDeleteOrder(selectedOrder.id)}
                        className="flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-xl text-sm font-medium transition-colors"
                      >
                        Excluir Pedido
                      </button>
                    )}
                    {(selectedOrder.status === 'Concluído' || selectedOrder.status === 'Cancelado') && (
                      <button
                        onClick={() => navigate('/servicos')}
                        className="flex items-center px-4 py-2 bg-[#FF8C00]/10 hover:bg-[#FF8C00]/20 text-[#FF8C00] rounded-xl text-sm font-medium transition-colors"
                      >
                        Refazer Pedido
                      </button>
                    )}
                    <button
                      onClick={() => generatePDF(selectedOrder)}
                      className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium transition-colors"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Recibo
                    </button>
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusIcon(selectedOrder.status)}
                      <span className="ml-2">{selectedOrder.status}</span>
                    </span>
                  </div>
                </div>

                {/* Visual Timeline */}
                <div className="mb-10">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Progresso do Pedido</h3>
                    {selectedOrder.status === 'Concluído' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-4 py-2 rounded-xl text-sm font-bold border border-green-200 dark:border-green-800"
                      >
                        Obrigado por escolher estes serviços
                      </motion.div>
                    )}
                  </div>
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

                {/* Items */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Serviços</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">{item.nome}</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-2">x{item.quantidade}</span>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(item.preco * item.quantidade)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Info & Upload */}
                {selectedOrder.status === 'Pendente' && (
                  <div className="mb-8 bg-orange-50 dark:bg-orange-900/10 p-6 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Informações de Pagamento</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Para que o seu serviço passe para "Em Andamento", por favor, faça o pagamento e envie o comprovativo abaixo. A verificação leva cerca de 5 minutos.
                    </p>
                    <div className="space-y-2 mb-6 font-mono text-sm bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between"><span className="font-bold">IBAN Banco BAI:</span> <span>0040 0000 17746567101 30</span></div>
                      <div className="flex justify-between"><span className="font-bold">IBAN Banco BNI:</span> <span>0052 0000 36141785101 55</span></div>
                      <div className="flex justify-between"><span className="font-bold">EXPRESS:</span> <span>945 456 835</span></div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Enviar Comprovativo de Pagamento
                      </label>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-orange-300 border-dashed rounded-xl cursor-pointer bg-orange-50/50 dark:bg-gray-800 hover:bg-orange-100/50 dark:hover:bg-gray-700 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 text-orange-500 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              <span className="font-semibold">Clique para enviar</span> ou arraste o arquivo
                            </p>
                          </div>
                          <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'payment_proof')} disabled={uploading} />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Attachments */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Anexos / Exemplos</h3>
                  {selectedOrder.attachment ? (
                    <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                      <FileText className="w-6 h-6 text-[#FF8C00] mr-3" />
                      <span className="text-gray-700 dark:text-gray-300 flex-grow">Anexo enviado</span>
                      <a href={selectedOrder.attachment} target="_blank" rel="noopener noreferrer" className="text-[#FF8C00] hover:underline text-sm font-medium">Ver Arquivo</a>
                    </div>
                  ) : (
                    <div>
                      <label className="flex items-center justify-center w-full h-24 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex flex-col items-center justify-center">
                          <Upload className="w-6 h-6 text-gray-500 mb-1" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">Enviar exemplar do que deseja</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*,.pdf,.zip" onChange={(e) => handleFileUpload(e, 'attachment')} disabled={uploading} />
                      </label>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Mensagens</h3>
                  
                  <div className={`space-y-4 mb-6 max-h-96 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border transition-all duration-500 ${highlightChat ? 'border-[#FF8C00] ring-2 ring-[#FF8C00]/20 shadow-lg shadow-[#FF8C00]/10' : 'border-gray-200 dark:border-gray-700'}`}>
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender_role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-4 rounded-2xl max-w-[80%] ${msg.sender_role === 'user' ? 'bg-[#FF8C00] text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-tl-none'}`}>
                          {msg.sender_role !== 'user' && <p className="text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">Administração Fenix</p>}
                          {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                          {msg.file_url && (
                            <div className="mt-2">
                              {msg.file_type?.startsWith('image/') ? (
                                <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                                  <img src={msg.file_url} alt="Anexo" className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700" style={{ maxHeight: '200px' }} />
                                </a>
                              ) : (
                                <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-lg text-sm ${msg.sender_role === 'user' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'}`}>
                                  <FileText className="w-4 h-4" />
                                  <span className="truncate max-w-[200px]">{msg.file_name || 'Anexo'}</span>
                                  <Download className="w-4 h-4 ml-auto" />
                                </a>
                              )}
                            </div>
                          )}
                          <p className={`text-[10px] mt-1 text-right ${msg.sender_role === 'user' ? 'text-orange-200' : 'text-gray-400 dark:text-gray-500'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {chatMessages.length === 0 && (
                      <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">Nenhuma mensagem ainda.</p>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Escreva uma mensagem para a administração..."
                      className="flex-grow px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent outline-none"
                    />
                    <label className="cursor-pointer px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                      <input type="file" className="hidden" onChange={handleChatFileUpload} accept=".png,.jpg,.jpeg,.pdf,.tiff,.psd" />
                    </label>
                    <button
                      onClick={handleSendMessage}
                      disabled={!message.trim() && !fileData}
                      className="px-6 py-3 bg-[#FF8C00] hover:bg-orange-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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

                {/* Review Form */}
                {selectedOrder.status === 'Concluído' && !selectedOrder.has_reviewed && (
                  <div className="mt-8 bg-green-50 dark:bg-green-900/10 p-6 rounded-2xl border border-green-100 dark:border-green-900/30">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Avalie nosso serviço</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                      Seu feedback é muito importante para nós. Por favor, avalie o trabalho realizado.
                    </p>
                    <div className="flex items-center gap-2 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className={`p-1 transition-colors ${
                            star <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                          }`}
                        >
                          <Star className="w-8 h-8 fill-current" />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Deixe um comentário sobre sua experiência (opcional)"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none mb-4 resize-none h-24"
                    />
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Mostrar o trabalho realizado (opcional - até 5 imagens)
                      </label>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-4">
                          {reviewImages.map((img, index) => (
                            <div key={index} className="relative w-24 h-24">
                              <img src={img} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                              <button 
                                onClick={() => setReviewImages(prev => prev.filter((_, i) => i !== index))}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {reviewImages.length < 5 && (
                            <label className="cursor-pointer w-24 h-24 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/50 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                              <Upload className="w-6 h-6 text-gray-400" />
                              <span className="text-[10px] text-gray-500 mt-1">Adicionar</span>
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                multiple
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  const remainingSlots = 5 - reviewImages.length;
                                  const filesToProcess = files.slice(0, remainingSlots);
                                  
                                  filesToProcess.forEach(file => {
                                    if (file.size > 10 * 1024 * 1024) {
                                      toast.error(`Arquivo ${file.name} excede 10MB`);
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setReviewImages(prev => [...prev, reader.result as string].slice(0, 5));
                                    };
                                    reader.readAsDataURL(file);
                                  });
                                }} 
                              />
                            </label>
                          )}
                        </div>
                        {reviewImages.length > 0 && (
                          <p className="text-xs text-gray-500">{reviewImages.length} de 5 imagens selecionadas</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleSubmitReview}
                      disabled={submittingReview}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                      {submittingReview ? 'Enviando...' : 'Enviar Avaliação'}
                    </button>
                  </div>
                )}
                
                {selectedOrder.status === 'Concluído' && selectedOrder.has_reviewed && (
                  <div className="mt-8 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 text-center">
                    <Star className="w-12 h-12 text-yellow-400 mx-auto mb-2 fill-current" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Obrigado pela sua avaliação!</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                      Sua opinião nos ajuda a melhorar nossos serviços continuamente.
                    </p>
                  </div>
                )}

              </motion.div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col items-center justify-center">
                <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">Selecione um pedido</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Clique em um pedido na lista ao lado para ver os detalhes, enviar comprovativos ou mensagens.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
