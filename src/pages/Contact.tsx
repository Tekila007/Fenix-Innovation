import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Send, Mail, User, MessageSquare, CheckCircle } from 'lucide-react';
import emailjs from '@emailjs/browser';
import axios from 'axios';
import toast from 'react-hot-toast';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  message: z.string().min(10, 'A mensagem deve ter no mínimo 10 caracteres'),
});

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [errors, setErrors] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = () => {
    try {
      contactSchema.parse(formData);
      setErrors({ name: '', email: '', message: '' });
      return true;
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const newErrors = { name: '', email: '', message: '' };
        err.issues.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as keyof typeof newErrors] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // 1. Send to Admin Panel (Database)
      await axios.post('/api/mensagens', formData);

      // 2. Send via EmailJS (Optional, but requested)
      // Note: Replace these with actual EmailJS credentials if needed
      // await emailjs.send(
      //   'YOUR_SERVICE_ID',
      //   'YOUR_TEMPLATE_ID',
      //   {
      //     from_name: formData.name,
      //     reply_to: formData.email,
      //     message: formData.message,
      //   },
      //   'YOUR_PUBLIC_KEY'
      // );

      setIsSuccess(true);
      setFormData({ name: '', email: '', message: '' });
      toast.success('Mensagem enviada com sucesso!');
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Ocorreu um erro ao enviar a mensagem. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 pt-24 pb-20 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold mb-4"
          >
            Fale <span className="text-[#FF8C00]">Conosco</span>
          </motion.h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Tem alguma dúvida ou solicitação? Envie-nos uma mensagem e responderemos o mais breve possível.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          {isSuccess ? (
            <div className="text-center py-12">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Mensagem Enviada!</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Obrigado por entrar em contato. Nossa equipe analisará sua mensagem e retornará em breve.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`block w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border ${
                      errors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                    } rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent transition-colors`}
                    placeholder="Seu nome"
                  />
                </div>
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`block w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border ${
                      errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                    } rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent transition-colors`}
                    placeholder="seu@email.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mensagem
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-4 pointer-events-none">
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                  </div>
                  <textarea
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className={`block w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border ${
                      errors.message ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                    } rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent transition-colors resize-none`}
                    placeholder="Como podemos ajudar?"
                  />
                </div>
                {errors.message && <p className="mt-1 text-sm text-red-500">{errors.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-[#fec24e] to-[#FF8C00] hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-70 disabled:transform-none"
              >
                {isSubmitting ? (
                  'Enviando...'
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" /> Enviar Mensagem
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;
