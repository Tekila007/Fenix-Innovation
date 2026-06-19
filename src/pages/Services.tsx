import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Palette, 
  Printer, 
  Video, 
  Monitor, 
  PenTool, 
  ArrowRight, 
  Search,
  Instagram,
  Play,
  FileText,
  Brush,
  Package
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const categories = [
  {
    id: 'redes-sociais',
    name: 'Design para Redes Sociais',
    description: 'Posts, capas, stories e banners para alavancar suas redes.',
    icon: (
      <motion.div whileHover={{ scale: 1.2, rotate: 5 }} className="inline-block">
        <Instagram className="w-10 h-10 mb-4 text-[#FF8C00]" />
      </motion.div>
    )
  },
  {
    id: 'impressao',
    name: 'Design para Impressão',
    description: 'Flyers, cartazes, outdoors e materiais gráficos de alta qualidade.',
    icon: (
      <motion.div whileHover={{ scale: 1.2, rotate: -5 }} className="inline-block">
        <Printer className="w-10 h-10 mb-4 text-[#FF8C00]" />
      </motion.div>
    )
  },
  {
    id: 'motion-design',
    name: 'Motion Design',
    description: 'Animações, vídeos promocionais e motion gráfico publicitário.',
    icon: (
      <motion.div whileHover={{ scale: 1.2, rotate: 5 }} className="inline-block">
        <Play className="w-10 h-10 mb-4 text-[#FF8C00]" />
      </motion.div>
    )
  },
  {
    id: 'web-design',
    name: 'Web Design',
    description: 'Criação de sites, landing pages e interfaces para aplicativos.',
    icon: (
      <motion.div whileHover={{ scale: 1.2, rotate: -5 }} className="inline-block">
        <Monitor className="w-10 h-10 mb-4 text-[#FF8C00]" />
      </motion.div>
    )
  },
  {
    id: 'direcao-de-arte',
    name: 'Direção de Arte',
    description: 'Conceito criativo, planejamento visual e estratégia de marca.',
    icon: (
      <motion.div whileHover={{ scale: 1.2, rotate: 5 }} className="inline-block">
        <Palette className="w-10 h-10 mb-4 text-[#FF8C00]" />
      </motion.div>
    )
  }
];

const Services = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 pt-24 pb-20 transition-colors duration-300">
      <Helmet>
        <title>Serviços | Fênix Innovation</title>
        <meta name="description" content="Soluções completas para impulsionar o seu negócio no mundo digital. Design para redes sociais, impressão, motion design, web design e direção de arte." />
        <meta name="keywords" content="serviços de design, web design, motion design, redes sociais, direção de arte" />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-extrabold mb-4"
          >
            Nossos <span className="text-[#FF8C00]">Serviços</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8"
          >
            Soluções completas para impulsionar o seu negócio no mundo digital. Escolha uma categoria abaixo para ver os pacotes.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="max-w-md mx-auto relative"
          >
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar serviços ou categorias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF8C00] focus:border-[#FF8C00] sm:text-sm transition duration-150 ease-in-out"
            />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-3xl p-10 shadow-sm hover:shadow-2xl hover:shadow-orange-500/10 border border-gray-100 dark:border-gray-700 transition-all duration-500 flex flex-col h-full group"
              >
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                      {React.cloneElement(category.icon.props.children, { className: "w-6 h-6 text-[#FF8C00]", mb: 0 })}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{category.name}</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-8">
                    {category.description}
                  </p>
                </div>

                <Link
                  to={`/servicos/${category.id}`}
                  className="inline-flex items-center justify-center py-3 px-6 rounded-xl font-bold text-[#FF8C00] bg-orange-50 dark:bg-orange-900/20 hover:bg-[#FF8C00] hover:text-white transition-all duration-300 group-hover:shadow-md"
                >
                  Ver Pacotes <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-lg">Nenhum serviço encontrado para "{searchTerm}".</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Services;
