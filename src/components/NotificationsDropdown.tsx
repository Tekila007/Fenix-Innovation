import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  link: string;
  created_at: string;
}

const NotificationsDropdown = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { token, isAuthenticated, user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Socket.IO Real-time subscription
    if (isAuthenticated && user) {
      if (!socketRef.current) {
        socketRef.current = io();
      }
      
      const socket = socketRef.current;
      socket.emit('join', { room: `user_${user.id}`, role: user.role });

      socket.on('receive_notification', (newNotification: Notification) => {
        setNotifications((prev) => [newNotification, ...prev]);
      });

      return () => {
        socket.off('receive_notification');
      };
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await axios.put(`/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await axios.delete(`/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteAllNotifications = async () => {
    if (!window.confirm('Tem certeza que deseja apagar todas as notificações?')) return;
    try {
      await axios.delete('/api/notifications/delete-all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications([]);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 dark:text-gray-300 hover:text-[#FF8C00] transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center transform translate-x-1 -translate-y-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-900 dark:text-white">Notificações</h3>
              {notifications.length > 0 && (
                <button
                  onClick={deleteAllNotifications}
                  className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center"
                  title="Apagar todas"
                >
                  <Trash2 size={14} className="mr-1" /> Limpar
                </button>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#FF8C00] hover:text-orange-600 font-medium flex items-center"
              >
                <Check size={14} className="mr-1" /> Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                Nenhuma notificação no momento.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 relative group ${!notification.is_read ? 'bg-orange-50/50 dark:bg-orange-900/10 border-[#FF8C00]' : 'border-transparent'}`}
                    onClick={() => {
                      if (!notification.is_read) markAsRead(notification.id);
                      setIsOpen(false);
                    }}
                  >
                    <button
                      onClick={(e) => deleteNotification(e, notification.id)}
                      className="absolute top-4 right-4 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Apagar"
                    >
                      <Trash2 size={14} />
                    </button>

                    {notification.link ? (
                      <Link to={notification.link} className="block pr-6">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-sm font-semibold pr-2 ${!notification.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                            {notification.title}
                          </h4>
                          {!notification.is_read && <span className="w-2 h-2 rounded-full bg-[#FF8C00] mt-1.5 flex-shrink-0"></span>}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{notification.message}</p>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(notification.created_at).toLocaleString('pt-BR')}
                        </span>
                      </Link>
                    ) : (
                      <div className="pr-6">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-sm font-semibold pr-2 ${!notification.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                            {notification.title}
                          </h4>
                          {!notification.is_read && <span className="w-2 h-2 rounded-full bg-[#FF8C00] mt-1.5 flex-shrink-0"></span>}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{notification.message}</p>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(notification.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;
