import React from 'react';
import { motion } from 'motion/react';
import { Users, Target, Eye, Compass, Briefcase, Award } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const About = () => {
  const cards = [
    {
      icon: <Users className="w-8 h-8 text-[#FF8C00]" />,
      title: 'Quem Somos',
      description: 'A Fênix Innovation é uma agência criativa focada em resultados. Combinamos design, tecnologia e estratégia para elevar marcas ao próximo nível.'
    },
    {
      icon: <Briefcase className="w-8 h-8 text-[#FF8C00]" />,
      title: 'O Que Fazemos',
      description: 'Oferecemos soluções completas em design gráfico, web design, motion e direção de arte, criando experiências visuais que convertem.'
    },
    {
      icon: <Target className="w-8 h-8 text-[#FF8C00]" />,
      title: 'Nossa Missão',
      description: 'Transformar ideias em identidades visuais poderosas, ajudando empresas a se destacarem e alcançarem seus objetivos de negócios.'
    },
    {
      icon: <Eye className="w-8 h-8 text-[#FF8C00]" />,
      title: 'Nossa Visão',
      description: 'Ser a agência de inovação e design mais reconhecida pela excelência criativa e pelo impacto real gerado para nossos clientes.'
    },
    {
      icon: <Compass className="w-8 h-8 text-[#FF8C00]" />,
      title: 'Nosso Foco',
      description: 'Nosso foco é o sucesso do cliente. Cada projeto é desenvolvido com atenção aos detalhes, criatividade e alinhamento estratégico.'
    },
    {
      icon: <Award className="w-8 h-8 text-[#FF8C00]" />,
      title: 'Nossos Objetivos',
      description: 'Inovar constantemente, entregar projetos de altíssima qualidade e construir parcerias duradouras baseadas em confiança e resultados.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 pt-24 pb-20 transition-colors duration-300">
      <Helmet>
        <title>Sobre Nós | Fênix Innovation</title>
        <meta name="description" content="Conheça a Fênix Innovation, uma agência criativa focada em resultados, combinando design, tecnologia e estratégia." />
        <meta name="keywords" content="sobre nós, agência criativa, missão, visão, valores, design" />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-extrabold mb-4"
          >
            Sobre a <span className="text-[#FF8C00]">Fênix Innovation</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto"
          >
            Somos apaixonados por inovação e design. Nossa equipe trabalha incansavelmente para transformar a sua visão em realidade, criando soluções digitais que inspiram e conectam.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
            >
              <div className="bg-orange-50 dark:bg-orange-900/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                {card.icon}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{card.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {card.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default About;
