import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, ShieldCheck } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose, onAccept, showAcceptButton = false }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-gray-900 rounded-[2rem] sm:rounded-[3rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/10 flex flex-col"
          >
            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Termos e Privacidade</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-8">
              {/* Termos de Serviço */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">📄</span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Termos de Serviço – Fênix Innovation</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  Bem-vindo à Fênix Innovation. Ao acessar ou utilizar os nossos serviços, você concorda com os presentes Termos de Serviço.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">1. Aceitação dos Termos</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ao utilizar os nossos serviços digitais, plataformas, aplicações ou conteúdos, o usuário declara ter lido, compreendido e aceitado estes termos.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">2. Uso dos Serviços</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Os serviços da Fênix Innovation devem ser utilizados de forma ética, legal e responsável. É proibido: Utilizar os serviços para fins ilícitos, interferir no funcionamento da plataforma ou violar direitos de terceiros.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">3. Cadastro e Responsabilidade do Usuário</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">O usuário é responsável pela veracidade das informações fornecidas e pela segurança dos seus dados de acesso. Qualquer atividade realizada na conta é de responsabilidade do próprio usuário.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">4. Propriedade Intelectual</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Todos os conteúdos, incluindo identidade visual, designs, vídeos, softwares, textos e materiais criados, são propriedade da Fênix Innovation, salvo indicação contrária. É proibida a reprodução, distribuição ou modificação sem autorização prévia.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">5. Disponibilidade dos Serviços</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">A Fênix Innovation compromete-se a manter os serviços operacionais, mas não garante disponibilidade contínua, podendo ocorrer interrupções por manutenção ou fatores externos.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">6. Limitação de Responsabilidade</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">A Fênix Innovation não se responsabiliza por danos indiretos ou perdas de dados, uso indevido da plataforma ou falhas técnicas fora do seu controlo.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">7. Alterações dos Termos</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Reservamo-nos o direito de atualizar estes Termos a qualquer momento. As alterações entram em vigor após a sua publicação.</p>
                  </div>
                </div>
              </section>

              {/* Política de Privacidade */}
              <section className="pt-8 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🔐</span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Política de Privacidade – Fênix Innovation</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  A Fênix Innovation valoriza a sua privacidade e compromete-se com a proteção dos seus dados pessoais.
                </p>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">1. Coleta de Informações</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Podemos coletar dados como: Nome completo, E-mail, contacto telefónico e dados de navegação e interação.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">2. Finalidade dos Dados</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">As informações coletadas são utilizadas para fornecer e melhorar os nossos serviços, personalizar a experiência do usuário e comunicação institucional.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">3. Compartilhamento de Dados</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">A Fênix Innovation não vende dados pessoais. Os dados podem ser compartilhados apenas quando necessário para execução do serviço ou exigido por lei.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">4. Proteção de Dados</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Adotamos medidas técnicas e organizacionais para proteger os dados contra acessos não autorizados, perda ou alteração.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">5. Direitos do Usuário</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">O usuário pode, a qualquer momento solicitar acesso aos seus dados, corrigir ou atualizar informações ou solicitar a exclusão dos dados.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">6. Cookies e Tecnologias</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Podemos utilizar cookies para melhorar a navegação, analisar desempenho e oferecer conteúdo personalizado.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">7. Alterações da Política</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Esta política pode ser atualizada periodicamente. Recomendamos a consulta regular.</p>
                  </div>
                </div>
              </section>
            </div>

            {showAcceptButton && (
              <div className="p-6 sm:p-8 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={onAccept}
                  className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl shadow-xl shadow-orange-600/20 transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-5 h-5" />
                  Aceito os Termos e Condições
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TermsModal;
