import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, formatAOA } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, ArrowRight, ShoppingBag, Plus, Minus, Tag } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, subtotal, discount, discountPercent, total, applyCoupon, removeCoupon, couponCode } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState('');
  const [loadingCoupon, setLoadingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) {
      toast.error('Por favor, insira um código de cupom.');
      return;
    }
    
    if (code.length < 3) {
      toast.error('O código do cupom deve ter pelo menos 3 caracteres.');
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(code)) {
      toast.error('O código do cupom deve conter apenas letras e números.');
      return;
    }

    setLoadingCoupon(true);
    try {
      const res = await axios.post('/api/coupons/validate', { code: code });
      applyCoupon(res.data.code, res.data.discount_percentage);
      toast.success('Cupom aplicado com sucesso!');
      setCouponInput('');
    } catch (error) {
      toast.error('Cupom inválido ou expirado.');
    } finally {
      setLoadingCoupon(false);
    }
  };

  const handleCheckout = () => {
    if (isAuthenticated) {
      navigate('/checkout');
    } else {
      navigate('/cadastro?redirect=/checkout');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center pt-24 pb-20 px-4 transition-colors duration-300">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Seu carrinho está vazio</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Parece que você ainda não adicionou nenhum serviço ao seu carrinho. Explore nossos serviços e encontre o que precisa.
          </p>
          <Link
            to="/servicos"
            className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-[#fec24e] to-[#FF8C00] rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
          >
            Explorar Serviços
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-20 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-extrabold text-gray-900 dark:text-white mb-12"
        >
          Seu Carrinho
        </motion.h1>

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
          <div className="lg:col-span-8">
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
              className="border-t border-b border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700"
            >
              <AnimatePresence>
                {cart.map((item) => (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                    className="flex py-6 sm:py-10"
                  >
                    <div className="flex-1 flex flex-col justify-between ml-4 sm:ml-6">
                      <div className="relative pr-9 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:pr-0">
                        <div>
                          <div className="flex justify-between">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              {item.nome}
                            </h3>
                          </div>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {item.categoria}
                          </p>
                          <div className="flex items-center mt-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantidade - 1)}
                              className="p-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="mx-3 font-medium text-gray-900 dark:text-white">{item.quantidade}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantidade + 1)}
                              className="p-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 sm:mt-0 sm:pr-9 flex items-center justify-between">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatAOA(item.preco * item.quantidade)}
                          </p>
                          <div className="absolute top-0 right-0 sm:relative sm:top-auto sm:right-auto">
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              className="-m-2 p-2 inline-flex text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <span className="sr-only">Remover</span>
                              <Trash2 className="h-5 w-5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-16 bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 lg:mt-0 lg:col-span-4"
          >
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Resumo do Pedido</h2>
            
            {/* Coupon Section */}
            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cupom de Desconto</label>
              {couponCode ? (
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-200 dark:border-green-800/30">
                  <div className="flex items-center text-green-700 dark:text-green-400">
                    <Tag className="w-4 h-4 mr-2" />
                    <span className="font-bold">{couponCode}</span>
                  </div>
                  <button onClick={removeCoupon} className="text-red-500 hover:text-red-700 text-sm font-medium">
                    Remover
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Digite seu cupom"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-[#FF8C00] focus:border-[#FF8C00] bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={loadingCoupon || !couponInput.trim()}
                    className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-xl hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    {loadingCoupon ? '...' : 'Aplicar'}
                  </button>
                </div>
              )}
            </div>

            <dl className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-between">
                <dt>Subtotal</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{formatAOA(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                  <dt>Desconto ({(discountPercent * 100).toFixed(0)}%)</dt>
                  <dd className="font-medium">-{formatAOA(discount)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                <dt className="text-base font-bold text-gray-900 dark:text-white">Total</dt>
                <dd className="text-xl font-extrabold text-[#FF8C00]">{formatAOA(total)}</dd>
              </div>
            </dl>

            <div className="mt-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCheckout}
                className="w-full flex items-center justify-center px-6 py-4 border border-transparent rounded-full shadow-lg text-base font-bold text-white bg-gradient-to-r from-[#fec24e] to-[#FF8C00] hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center">
                  {isAuthenticated ? 'Finalizar Pedido' : 'Cadastrar e Finalizar'}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 h-full w-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
