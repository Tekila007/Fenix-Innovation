import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Shield, Clock, Trash2, Check, CheckCheck, Paperclip, X, Bot, ChevronLeft, Download, FileText, Image as ImageIcon } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Message {
  id: number;
  sender_id: number | null;
  session_id: string;
  sender_role: 'user' | 'admin' | 'ai';
  message: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  status?: 'active' | 'deleted_for_all';
  created_at: string;
}

interface ChatSession {
  session_id: string;
  last_msg: string;
  user_name?: string;
  user_avatar?: string;
}

const Mensagens = () => {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionId = useRef<string>(localStorage.getItem('chat_session_id') || `session_${Math.random().toString(36).substring(2, 11)}`);

  useEffect(() => {
    if (!localStorage.getItem('chat_session_id')) {
      localStorage.setItem('chat_session_id', sessionId.current);
    }

    // Initialize Socket.IO
    socketRef.current = io();

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('join', {
        room: isAdmin ? 'admin_room' : sessionId.current,
        role: isAdmin ? 'admin' : 'user',
        userId: user?.id
      });
    });

    socketRef.current.on('receive_message', (message: Message) => {
      if (isAdmin) {
        fetchSessions();
        if (activeSession === message.session_id) {
          setMessages(prev => [...prev, message]);
        }
      } else {
        setMessages(prev => [...prev, message]);
      }
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

    if (isAdmin) {
      fetchSessions();
    } else {
      fetchHistory(sessionId.current);
    }

    return () => {
      socketRef.current?.disconnect();
    };
  }, [isAdmin, activeSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSessions = async () => {
    try {
      const response = await axios.get('/api/admin/chats');
      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchHistory = async (sid: string) => {
    try {
      const response = await axios.get(`/api/chat/history/${sid}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, fileData?: any) => {
    e?.preventDefault();
    if (!newMessage.trim() && !fileData) return;

    const messageData = {
      sender_id: user?.id || null,
      session_id: isAdmin ? activeSession : sessionId.current,
      sender_role: isAdmin ? 'admin' : 'user',
      message: newMessage || (fileData ? `Ficheiro: ${fileData.name}` : ''),
      file_url: fileData?.url,
      file_name: fileData?.name,
      file_type: fileData?.type,
      room: isAdmin ? activeSession : sessionId.current,
      created_at: new Date().toISOString()
    };

    socketRef.current?.emit('send_message', messageData);
    
    if (!isAdmin && !isAdminOnline && !fileData) {
      try {
        await axios.post('/api/chatbot', {
          message: newMessage,
          sessionId: sessionId.current
        });
      } catch (error) {
        console.error('Chatbot error:', error);
      }
    }

    setNewMessage('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      handleSendMessage(undefined, response.data);
      toast.success('Ficheiro enviado');
    } catch (error) {
      toast.error('Erro ao enviar ficheiro');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteMessage = async (messageId: number, type: 'self' | 'all') => {
    try {
      await axios.delete(`/api/chat/message/${messageId}`, { data: { type } });
      socketRef.current?.emit('delete_message', { messageId, type, room: isAdmin ? activeSession : sessionId.current });
      
      if (type === 'self') {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      } else {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, status: 'deleted_for_all', message: 'Esta mensagem foi eliminada' } : msg
        ));
      }
      toast.success('Mensagem eliminada');
    } catch (error) {
      toast.error('Erro ao eliminar mensagem');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Acesso Restrito</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Por favor, faça login para aceder às suas mensagens.</p>
          <button 
            onClick={() => window.location.href = '#/cadastro'}
            className="bg-orange-500 text-white px-8 py-3 rounded-full font-bold"
          >
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 bg-gray-50 dark:bg-gray-950 flex overflow-hidden h-screen">
      {/* Sidebar for Admin */}
      {isAdmin && (
        <div className={`
          ${showSidebar ? 'w-full md:w-80' : 'w-0'} 
          border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col transition-all duration-300 overflow-hidden
        `}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-xl font-bold">Conversas</h2>
            <button className="md:hidden" onClick={() => setShowSidebar(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Nenhuma conversa encontrada.</div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.session_id}
                  onClick={() => {
                    setActiveSession(session.session_id);
                    fetchHistory(session.session_id);
                    if (window.innerWidth < 768) setShowSidebar(false);
                  }}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 ${
                    activeSession === session.session_id ? 'bg-orange-50 dark:bg-orange-900/10 border-l-4 border-l-orange-500' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center overflow-hidden">
                    {session.user_avatar ? (
                      <img src={session.user_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} className="text-orange-500" />
                    )}
                  </div>
                  <div className="text-left overflow-hidden flex-grow">
                    <div className="font-bold truncate">{session.user_name || session.session_id}</div>
                    <div className="text-[10px] text-gray-500 truncate">
                      Última: {new Date(session.last_msg).toLocaleString()}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className={`flex-grow flex flex-col bg-white dark:bg-gray-900 shadow-xl ${isAdmin && showSidebar ? 'hidden md:flex' : 'flex'}`}>
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button 
                onClick={() => setShowSidebar(true)}
                className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              {isAdmin ? <User size={20} className="text-orange-600" /> : <Shield size={20} className="text-orange-600" />}
            </div>
            <div>
              <h3 className="font-bold">
                {isAdmin ? (sessions.find(s => s.session_id === activeSession)?.user_name || activeSession || 'Selecione uma conversa') : 'Suporte Fênix'}
              </h3>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isAdminOnline || isAdmin ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-xs text-gray-500">{isAdminOnline || isAdmin ? 'Online' : 'Offline (ChatBot Ativo)'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
                <Bot size={40} className="text-orange-500" />
              </div>
              <h4 className="text-lg font-bold mb-2">Bem-vindo ao Chat Fênix</h4>
              <p className="text-gray-500 max-w-xs">
                {isAdmin ? 'Selecione uma conversa na lateral para começar.' : 'Olá! Como podemos ajudar você hoje? Sinta-se à vontade para tirar suas dúvidas.'}
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isOwn = (isAdmin && msg.sender_role === 'admin') || (!isAdmin && msg.sender_role === 'user');
              const isAI = msg.sender_role === 'ai';
              
              return (
                <div key={msg.id || index} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] group relative`}>
                    <div className={`
                      p-3 rounded-2xl shadow-sm
                      ${isOwn ? 'bg-orange-500 text-white rounded-tr-none' : 
                        isAI ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 rounded-tl-none border border-blue-100 dark:border-blue-800' : 
                        'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-700'}
                    `}>
                      {msg.status === 'deleted_for_all' ? (
                        <span className="italic opacity-70 flex items-center gap-2 text-xs">
                          <Trash2 size={14} /> Esta mensagem foi eliminada
                        </span>
                      ) : (
                        <>
                          {msg.file_url ? (
                            <div className="space-y-2">
                              {msg.file_type?.startsWith('image/') ? (
                                <img src={msg.file_url} alt={msg.file_name} className="max-w-full rounded-lg cursor-pointer" onClick={() => window.open(msg.file_url)} />
                              ) : (
                                <div className="flex items-center gap-3 p-2 bg-black/5 dark:bg-white/5 rounded-lg">
                                  <FileText size={24} />
                                  <div className="flex-grow overflow-hidden">
                                    <div className="text-xs font-bold truncate">{msg.file_name}</div>
                                    <div className="text-[10px] opacity-70">{msg.file_type}</div>
                                  </div>
                                  <a href={msg.file_url} download={msg.file_name} className="p-1.5 hover:bg-black/10 rounded-full transition-colors">
                                    <Download size={16} />
                                  </a>
                                </div>
                              )}
                              {msg.message && !msg.message.startsWith('Ficheiro:') && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          )}
                          <div className={`text-[10px] mt-1 flex items-center gap-1 ${isOwn ? 'text-orange-100' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isOwn && <CheckCheck size={12} />}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Message Actions */}
                    {msg.status !== 'deleted_for_all' && (
                      <div className={`
                        absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1
                        ${isOwn ? 'right-full mr-2' : 'left-full ml-2'}
                      `}>
                        <button 
                          onClick={() => handleDeleteMessage(msg.id, 'self')}
                          className="p-1.5 bg-white dark:bg-gray-800 shadow-md rounded-full text-gray-500 hover:text-red-500 transition-colors"
                          title="Eliminar para mim"
                        >
                          <Trash2 size={14} />
                        </button>
                        {isOwn && (
                          <button 
                            onClick={() => handleDeleteMessage(msg.id, 'all')}
                            className="p-1.5 bg-white dark:bg-gray-800 shadow-md rounded-full text-gray-500 hover:text-red-500 transition-colors"
                            title="Eliminar para todos"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        {(activeSession || !isAdmin) && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2 text-gray-500 hover:text-orange-500 transition-colors disabled:opacity-50"
              >
                <Paperclip size={20} />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escreva a sua mensagem..."
                className="flex-grow p-3 bg-gray-100 dark:bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isUploading}
                className="p-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Mensagens;
