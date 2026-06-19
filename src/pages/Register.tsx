import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Lock, Phone, FileText, Building, MessageSquare, X, ArrowRight, CheckCircle2, Globe, ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import TermsModal from '../components/TermsModal';

import { triggerSuccessConfetti } from '../utils/confetti';

const countries = [
  { code: '+244', name: 'Angola', flag: '🇦🇴' },
  { code: '+351', name: 'Portugal', flag: '🇵🇹' },
  { code: '+55', name: 'Brasil', flag: '🇧🇷' },
  { code: '+258', name: 'Moçambique', flag: '🇲🇿' },
  { code: '+238', name: 'Cabo Verde', flag: '🇨🇻' },
  { code: '+245', name: 'Guiné-Bissau', flag: '🇬🇼' },
  { code: '+239', name: 'São Tomé e Príncipe', flag: '🇸🇹' },
  { code: '+1', name: 'USA', flag: '🇺🇸' },
  { code: '+44', name: 'UK', flag: '🇬🇧' },
  { code: '+34', name: 'Espanha', flag: '🇪🇸' },
  { code: '+33', name: 'França', flag: '🇫🇷' },
  { code: '+49', name: 'Alemanha', flag: '🇩🇪' },
  { code: '+81', name: 'Japão', flag: '🇯🇵' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+91', name: 'Índia', flag: '🇮🇳' },
  { code: '+27', name: 'África do Sul', flag: '🇿🇦' },
  { code: '+234', name: 'Nigéria', flag: '🇳🇬' },
];

const registerSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  telefone: z.string().min(9, 'O telefone deve ter no mínimo 9 dígitos').optional().or(z.literal('')),
  nif: z.string().optional(),
  mensagem: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'A senha é obrigatória'),
});

const Register = () => {
  const [isLogin, setIsLogin] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    if (mode === 'register') {
      setIsLogin(false);
    } else if (mode === 'login') {
      setIsLogin(true);
    }
  }, [location.search]);

  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'password'>('email');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetUserId, setResetUserId] = useState('');
  const [tipo, setTipo] = useState<'cliente' | 'empresa'>('cliente');
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    telefone: '',
    nif: '',
    mensagem: '',
  });
  const [error, setError] = useState('');
  const { login } = useAuth();

  const redirectUrl = new URLSearchParams(location.search).get('redirect') || '/';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isLogin) {
        loginSchema.parse({ email: formData.email, password: formData.password });
      } else {
        registerSchema.parse(formData);
        // Show terms modal before actual registration
        setIsTermsModalOpen(true);
        return;
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const errorMessage = err.issues[0].message;
        setError(errorMessage);
        toast.error(errorMessage);
        return;
      }
    }

    try {
      if (isLogin) {
        const res = await axios.post('/api/login', { email: formData.email, password: formData.password });
        login(res.data.token, res.data.user);
        toast.success('Seja bem vindo de volta!');
        navigate(redirectUrl);
      } else {
        const fullPhone = `${selectedCountry.code} ${formData.telefone}`;
        const res = await axios.post('/api/register', { ...formData, telefone: fullPhone, tipo });
        
        login(res.data.token, res.data.user);
        triggerSuccessConfetti();
        toast.success('Seja bem vindo!');
        navigate(redirectUrl);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Ocorreu um erro. Tente novamente.';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || isResending) return;
    
    setIsResending(true);
    try {
      const res = await axios.post('/api/resend-otp', { email: verificationEmail });
      toast.success(res.data.message);
      setResendCountdown(120); // 120 seconds cooldown to prevent token invalidation spam
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao reenviar código');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/verify-otp', {
        email: verificationEmail,
        token: otpCode,
        type: resetStep === 'otp' ? 'recovery' : 'signup'
      });
      
      if (resetStep === 'otp') {
        setResetStep('password');
        setResetToken(res.data.token || '');
        setResetUserId(res.data.user?.id || '');
        setNeedsVerification(false);
        setIsForgotPasswordModalOpen(true);
        toast.success('Código verificado! Agora defina sua nova senha.');
      } else {
        login(res.data.token, res.data.user);
        triggerSuccessConfetti();
        toast.success('Seja bem vindo!');
        navigate(redirectUrl);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Código inválido. Tente novamente.';
      toast.error(errorMessage);
    }
  };

  const handleAcceptTerms = async () => {
    setIsTermsModalOpen(false);
    try {
      const fullPhone = `${selectedCountry.code} ${formData.telefone}`;
      const res = await axios.post('/api/register', { ...formData, telefone: fullPhone, tipo });
      
      login(res.data.token, res.data.user);
      triggerSuccessConfetti();
      toast.success('Seja bem vindo!');
      navigate(redirectUrl);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Ocorreu um erro. Tente novamente.';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      toast.error('Por favor, insira seu e-mail.');
      return;
    }
    setIsResettingPassword(true);
    try {
      const res = await axios.post('/api/forgot-password', { email: forgotPasswordEmail });
      setVerificationEmail(forgotPasswordEmail);
      setResetStep('otp');
      setIsForgotPasswordModalOpen(false);
      setNeedsVerification(true);
      if (res.data.code) {
        toast.success(`Código de verificação enviado! [DEV MODE] Seu código é: ${res.data.code}`, { duration: 15000 });
      } else {
        toast.success('Enviamos um código de recuperação para o seu e-mail.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao processar solicitação.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error('Por favor, insira a nova senha.');
      return;
    }

    setIsResettingPassword(true);
    try {
      await axios.post('/api/reset-password', { 
        password: newPassword,
        access_token: resetToken,
        userId: resetUserId
      });
      toast.success('Senha atualizada com sucesso! Agora você pode fazer login.');
      setIsForgotPasswordModalOpen(false);
      setIsLogin(true);
      setResetStep('email');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar senha.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 flex items-center justify-center p-0 sm:p-6 transition-colors duration-500 overflow-hidden font-sans">
      <div className="w-full max-w-6xl h-full sm:h-[750px] bg-white dark:bg-gray-900 sm:rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-hidden relative border border-white/20 dark:border-gray-800">
        
        {/* Visual Panel - Desktop Only */}
        <motion.div
          initial={false}
          animate={{ 
            x: isLogin ? '150%' : '0%',
            backgroundColor: isLogin ? '#FF8C00' : '#fec24e' // orange to gold
          }}
          transition={{ type: 'spring', stiffness: 45, damping: 18, mass: 1.2 }}
          className="hidden md:flex absolute top-0 bottom-0 left-0 z-30 w-[40%] items-center justify-center p-12 text-white overflow-hidden"
        >
          <AnimatePresence mode="wait">
            <motion.div 
              key={needsVerification ? 'verify-panel' : isLogin ? 'login-panel' : 'register-panel'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-center relative z-10"
            >
              <div className="mb-8 inline-flex p-4 bg-white/10 rounded-3xl backdrop-blur-md">
                {needsVerification ? <ShieldCheck className="w-10 h-10" /> : isLogin ? <User className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
              </div>
              <h2 className="text-4xl font-bold mb-6 tracking-tight">
                {needsVerification ? 'Verificação' : isLogin ? 'Novo por aqui?' : 'Bem-vindo de Volta!'}
              </h2>
              <p className="text-orange-50/80 mb-10 text-lg leading-relaxed max-w-xs mx-auto">
                {needsVerification 
                  ? 'Quase lá! Insira o código enviado para o seu e-mail para ativar sua conta.'
                  : isLogin 
                    ? 'Crie sua conta e descubra todas as possibilidades que preparamos para você.' 
                    : 'Acesse sua conta para continuar gerenciando seus projetos e serviços.'}
              </p>
              {!needsVerification && (
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="group flex items-center gap-2 mx-auto px-10 py-4 border-2 border-white/30 rounded-full font-bold hover:bg-white hover:text-orange-600 transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                  {isLogin ? 'CRIAR CONTA' : 'FAZER LOGIN'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </motion.div>
          </AnimatePresence>
          
          {/* Decorative elements */}
          <div className="absolute top-[-20%] right-[-20%] w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-[-20%] left-[-20%] w-96 h-96 bg-black/5 rounded-full blur-3xl" />
        </motion.div>

        {/* Form Section Wrapper */}
        <div className="w-full h-full flex relative bg-white dark:bg-gray-900">
          
          {/* Login Form */}
          <motion.div
            animate={{ 
              x: isLogin && !needsVerification ? '0%' : '-100%',
              opacity: isLogin && !needsVerification ? 1 : 0,
              scale: isLogin && !needsVerification ? 1 : 0.95
            }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="w-full md:w-[60%] h-full flex items-center justify-center p-8 md:p-16 absolute left-0 top-0 z-10"
          >
            <div className="w-full max-w-md">
              <div className="mb-10">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">Entrar</h1>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Bem-vindo de volta! Por favor, insira seus dados.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">E-mail</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="block w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[1.25rem] focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300 text-gray-900 dark:text-white placeholder:text-gray-400"
                      placeholder="exemplo@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Senha</label>
                    <button
                      type="button"
                      onClick={() => setIsForgotPasswordModalOpen(true)}
                      className="text-xs font-bold text-orange-600 hover:text-orange-500 transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                    </div>
                    <input
                      type="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="block w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[1.25rem] focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300 text-gray-900 dark:text-white placeholder:text-gray-400"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-[#FF8C00] hover:bg-[#e67e00] text-white font-bold rounded-[1.25rem] shadow-xl shadow-orange-600/20 transform hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 mt-4 text-lg"
                >
                  Entrar
                </button>

                <p className="md:hidden text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
                  Não tem uma conta?{' '}
                  <button onClick={() => setIsLogin(false)} className="font-bold text-orange-600 hover:text-orange-500 transition-colors">Cadastre-se</button>
                </p>
              </form>
            </div>
          </motion.div>

          {/* Register Form */}
          <motion.div
            animate={{ 
              x: !isLogin && !needsVerification ? '0%' : isLogin ? '100%' : '-100%',
              opacity: !isLogin && !needsVerification ? 1 : 0,
              scale: !isLogin && !needsVerification ? 1 : 0.95
            }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="w-full md:w-[60%] h-full flex items-center justify-center p-8 md:p-16 absolute right-0 top-0 z-10"
          >
            <div className="w-full max-w-md">
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">Criar Conta</h1>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Junte-se à nossa comunidade hoje.</p>
              </div>

                <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-8 w-fit mx-auto md:mx-0">
                  <button
                    type="button"
                    onClick={() => setTipo('cliente')}
                    className={`px-8 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 ${
                      tipo === 'cliente'
                        ? 'bg-white dark:bg-gray-700 text-orange-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    CLIENTE
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('empresa')}
                    className={`px-8 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 ${
                      tipo === 'empresa'
                        ? 'bg-white dark:bg-gray-700 text-orange-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    EMPRESA
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">
                      {tipo === 'empresa' ? 'Nome da Empresa' : 'Nome Completo'}
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        {tipo === 'empresa' ? <Building className="h-5 w-5 text-gray-400" /> : <User className="h-5 w-5 text-gray-400" />}
                      </div>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300 text-gray-900 dark:text-white"
                        placeholder={tipo === 'empresa' ? 'Fênix Innovation Lda' : 'João Silva'}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">E-mail</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300 text-gray-900 dark:text-white"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Senha</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="password"
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300 text-gray-900 dark:text-white"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Telefone</label>
                      <div className="flex gap-2">
                        <div className="relative w-28 flex-shrink-0">
                          <select
                            value={selectedCountry.code}
                            onChange={(e) => {
                              const country = countries.find(c => c.code === e.target.value);
                              if (country) setSelectedCountry(country);
                            }}
                            className="block w-full h-full pl-3 pr-8 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300 text-gray-900 dark:text-white appearance-none cursor-pointer text-sm font-bold"
                          >
                            {countries.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.flag} {c.code}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Globe className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                        <div className="relative flex-1 group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Phone className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="tel"
                            name="telefone"
                            required
                            value={formData.telefone}
                            onChange={handleChange}
                            className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300 text-gray-900 dark:text-white"
                            placeholder="900 000 000"
                          />
                        </div>
                      </div>
                    </div>

                    {tipo === 'empresa' && (
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">NIF</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <FileText className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            name="nif"
                            required
                            value={formData.nif}
                            onChange={handleChange}
                            className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300 text-gray-900 dark:text-white"
                            placeholder="123456789"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-[#FF8C00] hover:bg-[#e67e00] text-white font-bold rounded-2xl shadow-xl shadow-orange-600/20 transform hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 mt-4"
                  >
                    Cadastrar
                  </button>

                  <p className="text-center text-[10px] text-gray-500 dark:text-gray-400 mt-4">
                    Ao cadastrar-se, você concorda com nossos{' '}
                    <button type="button" onClick={() => setIsTermsModalOpen(true)} className="font-bold text-orange-600 hover:underline">Termos de Serviço</button> e{' '}
                    <button type="button" onClick={() => setIsTermsModalOpen(true)} className="font-bold text-orange-600 hover:underline">Política de Privacidade</button>.
                  </p>

                  <p className="md:hidden text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
                    Já tem uma conta?{' '}
                    <button onClick={() => setIsLogin(true)} className="font-bold text-orange-600 hover:text-orange-500 transition-colors">Entrar</button>
                  </p>
                </form>
            </div>
          </motion.div>

          {/* OTP Verification Form */}
          <motion.div
            animate={{ 
              x: needsVerification ? '0%' : '100%',
              opacity: needsVerification ? 1 : 0,
              scale: needsVerification ? 1 : 0.95
            }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="w-full md:w-[60%] h-full flex items-center justify-center p-8 md:p-16 absolute right-0 top-0 z-20 bg-white dark:bg-gray-900"
            style={{ pointerEvents: needsVerification ? 'auto' : 'none' }}
          >
            <div className="w-full max-w-md">
              <div className="mb-10">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                  {resetStep === 'otp' ? 'Recuperar Senha' : 'Verificar E-mail'}
                </h1>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/20">
                  <p className="text-gray-600 dark:text-gray-300 font-medium text-sm leading-relaxed">
                    {resetStep === 'otp' 
                      ? 'Insira o código de recuperação enviado para:' 
                      : 'Enviamos um código de 6 dígitos para:'}
                    <br />
                    <span className="text-[#FF8C00] font-bold text-base break-all">{verificationEmail}</span>
                  </p>
                  <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-2 font-bold uppercase tracking-wider">
                    Dica: Verifique a pasta de Spam ou Lixo Eletrônico
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Código OTP</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <ShieldCheck className="h-6 w-6 text-gray-400 group-focus-within:text-[#FF8C00] transition-colors" />
                    </div>
                    <input
                      type="text"
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="block w-full pl-12 pr-4 py-5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-[1.5rem] focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF8C00] outline-none transition-all duration-300 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 text-center text-3xl tracking-[0.4em] font-black"
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-[#FF8C00] hover:bg-[#e67e00] text-white font-bold rounded-[1.25rem] shadow-xl shadow-orange-600/20 transform hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 mt-4 text-lg"
                >
                  Verificar Código
                </button>

                <div className="text-center space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Não recebeu o código?{' '}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCountdown > 0 || isResending}
                      className={`font-bold transition-colors ${
                        resendCountdown > 0 || isResending
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-[#FF8C00] hover:text-orange-500'
                      }`}
                    >
                      {isResending ? 'Enviando...' : resendCountdown > 0 ? `Reenviar em ${resendCountdown}s` : 'Reenviar Código'}
                    </button>
                  </p>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setNeedsVerification(false);
                      setResetStep('email');
                    }}
                    className="text-sm font-bold text-gray-500 hover:text-orange-600 transition-colors"
                  >
                    {resetStep === 'otp' ? 'Voltar para o login' : 'Voltar para o cadastro'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>

        </div>

        {/* Mobile Visual Panel Overlay */}
        <div className="md:hidden w-full bg-[#FF8C00] p-8 text-white text-center relative overflow-hidden">
           <div className="relative z-10">
             <h3 className="text-2xl font-bold mb-2">
               {needsVerification ? 'Verificação' : isLogin ? 'Novo por aqui?' : 'Bem-vindo de Volta!'}
             </h3>
             <p className="text-orange-100 text-sm mb-6 max-w-xs mx-auto">
               {needsVerification ? 'Insira o código enviado para o seu e-mail.' : isLogin ? 'Crie sua conta e descubra todas as possibilidades.' : 'Acesse sua conta para continuar gerenciando tudo.'}
             </p>
             {!needsVerification && (
               <button
                 onClick={() => setIsLogin(!isLogin)}
                 className="px-8 py-3 border-2 border-white/30 rounded-full text-sm font-bold hover:bg-white hover:text-orange-600 transition-all duration-300"
               >
                 {isLogin ? 'CRIAR CONTA' : 'FAZER LOGIN'}
               </button>
             )}
           </div>
           <div className="absolute top-[-50%] right-[-20%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>

      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {isForgotPasswordModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl max-w-md w-full overflow-hidden border border-white/10"
            >
              <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {resetStep === 'password' ? 'Nova Senha' : 'Redefinir Senha'}
                </h2>
                <button onClick={() => setIsForgotPasswordModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              
              {resetStep === 'password' ? (
                <form onSubmit={handleResetPassword} className="p-8 space-y-6">
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                    Defina sua nova palavra-passe abaixo.
                  </p>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Nova Senha</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                      </div>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="block w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300 text-gray-900 dark:text-white"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="w-full py-4 bg-[#FF8C00] hover:bg-[#e67e00] text-white font-bold rounded-2xl shadow-xl shadow-orange-600/20 transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center"
                  >
                    {isResettingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Atualizar Senha'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotPassword} className="p-8 space-y-6">
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                    Insira o seu endereço de e-mail e enviaremos um código para redefinir a sua senha.
                  </p>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">E-mail</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                      </div>
                      <input
                        type="email"
                        required
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        className="block w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300 text-gray-900 dark:text-white"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="w-full py-4 bg-[#FF8C00] hover:bg-[#e67e00] text-white font-bold rounded-2xl shadow-xl shadow-orange-600/20 transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center"
                  >
                    {isResettingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Código'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Terms Modal */}
      <TermsModal 
        isOpen={isTermsModalOpen} 
        onClose={() => setIsTermsModalOpen(false)} 
        onAccept={handleAcceptTerms}
        showAcceptButton={!isLogin} // Only show accept button if we are in registration flow
      />
    </div>
  );
};

export default Register;
