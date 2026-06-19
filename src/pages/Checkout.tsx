import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart, formatAOA } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion } from 'motion/react';
import { CheckCircle, FileText, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { triggerSuccessConfetti } from '../utils/confetti';

const Checkout = () => {
  const { cart, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Logo/Header
    doc.setFontSize(24);
    doc.setTextColor(255, 140, 0); // #FF8C00
    doc.text('Fênix Innovation', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Orçamento Oficial', 14, 30);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 14, 36);

    // Client Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Dados do Cliente:', 14, 50);
    doc.setFontSize(10);
    doc.text(`Nome: ${user?.name}`, 14, 56);
    doc.text(`Email: ${user?.email}`, 14, 62);

    // Table
    const tableData = cart.map(item => [
      item.nome,
      item.categoria,
      item.quantidade.toString(),
      formatAOA(item.preco),
      formatAOA(item.preco * item.quantidade)
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['Serviço', 'Categoria', 'Qtd', 'Preço Unit.', 'Subtotal']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [255, 140, 0] },
      foot: [['', '', '', 'Total:', formatAOA(total)]],
      footStyles: { fillColor: [254, 194, 78], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Obrigado por escolher a Fênix Innovation!', 14, finalY + 20);
    doc.text('fenixinn12@gmail.com | Chamadas: +244 945 456 835 | WhatsApp: +244 952 368 856', 14, finalY + 26);

    doc.save('Orcamento_FenixInnovation.pdf');
  };

  const sendWhatsApp = () => {
    const phone = '244952368856'; // Replace with actual agency phone
    let message = `Olá, segue o orçamento.\n\n*Cliente:* ${user?.name}\n*Serviços:*\n`;
    
    cart.forEach(item => {
      message += `- ${item.quantidade}x ${item.nome} (${formatAOA(item.preco)})\n`;
    });
    
    message += `\n*Total:* ${formatAOA(total)}\n\nObrigado!`;
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  const handleConfirmOrder = async () => {
    setIsProcessing(true);
    try {
      await axios.post('/api/pedidos', { items: cart, total });
      
      generatePDF();
      sendWhatsApp();
      
      setIsSuccess(true);
      clearCart();
      triggerSuccessConfetti();
      toast.success('Boa escolha de serviço!');
    } catch (error) {
      console.error('Erro ao processar pedido:', error);
      toast.error('Ocorreu um erro ao processar seu pedido. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center pt-24 pb-20 px-4 transition-colors duration-300">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-xl max-w-lg w-full text-center border border-gray-100 dark:border-gray-700"
        >
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Pedido Confirmado!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Seu orçamento foi gerado e enviado via WhatsApp. Nossa equipe entrará em contato em breve.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-base font-bold text-white bg-gradient-to-r from-[#fec24e] to-[#FF8C00] hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Voltar ao Início
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-20 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-8 text-center">
            Finalizar Pedido
          </h1>

          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 dark:border-gray-700">Resumo dos Serviços</h3>
            <ul className="space-y-4">
              {cart.map(item => (
                <li key={item.id} className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{item.quantidade}x {item.nome}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatAOA(item.preco * item.quantidade)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span className="text-xl font-bold text-gray-900 dark:text-white">Total</span>
              <span className="text-2xl font-extrabold text-[#FF8C00]">{formatAOA(total)}</span>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-6 mb-8 border border-orange-100 dark:border-orange-800/30">
            <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-[#FF8C00]" /> O que acontece agora?
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 ml-7 list-disc">
              <li>Um PDF com o orçamento detalhado será gerado automaticamente.</li>
              <li>Você será redirecionado para o WhatsApp para enviar o pedido à nossa equipe.</li>
              <li>Entraremos em contato para alinhar os próximos passos.</li>
            </ul>
          </div>

          <button
            onClick={handleConfirmOrder}
            disabled={isProcessing}
            className="w-full flex items-center justify-center py-4 px-6 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white bg-gradient-to-r from-[#fec24e] to-[#FF8C00] hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin w-6 h-6 mr-2" /> Processando...
              </>
            ) : (
              <>
                <Send className="w-6 h-6 mr-2" /> Confirmar e Gerar Orçamento
              </>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Checkout;
