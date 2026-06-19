import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import fs from 'fs';

// Extend Express Request to include user
interface User {
  id: number;
  email: string;
  role: string;
  name?: string;
  avatar?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      file?: any;
    }
  }
}

dotenv.config();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_fenix_innovation';

if (JWT_SECRET === 'supersecretkey_fenix_innovation' && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: Using default JWT_SECRET in production! Please set JWT_SECRET environment variable.');
}

// Database setup
const db = new Database('fenix.db');
let io: Server;

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    telefone TEXT,
    nif TEXT,
    mensagem TEXT,
    bonus REAL DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    preco REAL NOT NULL,
    descricao TEXT,
    categoria TEXT,
    image TEXT,
    is_promo BOOLEAN DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'Pendente',
    payment_proof TEXT,
    attachment TEXT,
    client_message TEXT,
    admin_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    quantidade INTEGER NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    sender_role TEXT NOT NULL, -- 'user', 'admin'
    message TEXT,
    file_url TEXT,
    file_name TEXT,
    file_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(sender_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS general_chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    sender_id INTEGER,
    sender_role TEXT NOT NULL, -- 'user', 'admin', 'ai'
    message TEXT NOT NULL,
    file_url TEXT,
    file_name TEXT,
    file_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS feedbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    order_id INTEGER,
    service_id INTEGER,
    rating INTEGER NOT NULL,
    comment TEXT,
    work_image TEXT,
    approved BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    image TEXT NOT NULL,
    description TEXT,
    price TEXT,
    duration TEXT,
    delivery_method TEXT,
    status TEXT,
    video TEXT,
    images TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    discount_percentage REAL NOT NULL,
    active BOOLEAN DEFAULT 1
  );
`);

// Safe table migration for existing database instances
try { db.exec(`ALTER TABLE projects ADD COLUMN price TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE projects ADD COLUMN duration TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE projects ADD COLUMN delivery_method TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE projects ADD COLUMN status TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE projects ADD COLUMN video TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE projects ADD COLUMN images TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE projects ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;`); } catch (e) {}

// Seed initial admin user
const seedAdmins = async () => {
  const admins = [
    { email: 'admin@fenix.com', password: 'admin123', name: 'Admin Fenix' },
    { email: 'fenixinn12@gmail.com', password: 'Fenix123456', name: 'Admin Fenix' }
  ];

  for (const admin of admins) {
    const adminExists = db.prepare('SELECT * FROM users WHERE email = ?').get(admin.email);
    const hash = bcrypt.hashSync(admin.password, 10);
    
    if (!adminExists) {
      db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(admin.name, admin.email, hash, 'admin');
    } else {
      db.prepare('UPDATE users SET role = ?, password = ? WHERE email = ?').run('admin', hash, admin.email);
    }
  }
};
seedAdmins();

// Seed initial services
db.prepare("DELETE FROM services WHERE image LIKE 'https://images.unsplash.com/%'").run();
const servicesCount = db.prepare('SELECT COUNT(*) as count FROM services').get() as { count: number };
if (servicesCount.count === 0) {
  const initialServices = [
    { nome: 'Pacote Essencial Redes Sociais', preco: 15000, descricao: '12 posts mensais para Instagram e Facebook.', categoria: 'Design para Redes Sociais', image: '/uploads/projects/SOCIAL MEDIA.jpg' },
    { nome: 'Pacote Premium Redes Sociais', preco: 30000, descricao: '20 posts, 10 stories e gestão completa.', categoria: 'Design para Redes Sociais', image: '/uploads/projects/SOCIAL MEDIA (3).jpg' },
    { nome: 'Identidade Visual Completa', preco: 50000, descricao: 'Logotipo, paleta de cores, tipografia e manual da marca.', categoria: 'Direção de Arte', image: '/uploads/projects/Identidade Visual.jpg' },
    { nome: 'Kit Impressão Básico', preco: 10000, descricao: 'Design de cartões de visita e flyers de alta qualidade.', categoria: 'Design para Impressão', image: '/uploads/projects/Identidade Visual.jpg' },
    { nome: 'Vídeo Promocional 30s', preco: 40000, descricao: 'Animação em motion graphics de 30 segundos.', categoria: 'Motion Design', image: '/uploads/projects/MOTION.mp4' },
    { nome: 'Site Institucional', preco: 80000, descricao: 'Desenvolvimento de site responsivo moderno de alta performance com até 5 páginas.', categoria: 'Web Design', image: '/uploads/projects/UDX DESIGNER.jpg' },
    { nome: 'Landing Page Alta Conversão', preco: 45000, descricao: 'Página única responsiva com animação inteligente, foco em vendas e captação de leads.', categoria: 'Web Design', image: '/uploads/projects/UDX DESIGNER (2).mp4' }
  ];
  const insertService = db.prepare('INSERT INTO services (nome, preco, descricao, categoria, image) VALUES (?, ?, ?, ?, ?)');
  const insertMany = db.transaction((services) => {
    for (const s of services) insertService.run(s.nome, s.preco, s.descricao, s.categoria, s.image);
  });
  insertMany(initialServices);
}

// Seed initial projects
db.prepare("DELETE FROM projects WHERE image LIKE 'https://images.unsplash.com/%'").run();
db.prepare("DELETE FROM projects WHERE status IS NULL OR price IS NULL").run();
const projectsCount = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
if (projectsCount.count === 0) {
  const initialProjects = [
    {
      title: 'Identidade Visual Fênix',
      category: 'Direção de Arte',
      image: '/uploads/projects/Identidade Visual.jpg',
      description: 'Design de identidade visual inovadora, incluindo manual detalhado para diretrizes de marca e paleta conceitual impecável.',
      price: '50.000 Kz - 120.000 Kz',
      duration: '7 dias',
      delivery_method: 'Google Drive',
      status: 'Mais solicitado',
      video: '',
      images: JSON.stringify(['/uploads/projects/Identidade Visual.jpg', '/uploads/projects/SOCIAL MEDIA (3).jpg', '/uploads/projects/UDX DESIGNER.jpg'])
    },
    {
      title: 'Social Media Fênix',
      category: 'Design para Redes Sociais',
      image: '/uploads/projects/SOCIAL MEDIA.jpg',
      description: 'Posts estratégicos focados na atração de audiência, engajamento e identidade consistente de alto nível.',
      price: '15.000 Kz - 45.000 Kz',
      duration: '3 dias',
      delivery_method: 'WhatsApp',
      status: 'Disponível',
      video: '',
      images: JSON.stringify(['/uploads/projects/SOCIAL MEDIA.jpg', '/uploads/projects/SOCIAL MEDIA (2).jpg', '/uploads/projects/SOCIAL MEDIA (3).jpg'])
    },
    {
      title: 'Redes Sociais Premium',
      category: 'Design para Redes Sociais',
      image: '/uploads/projects/SOCIAL MEDIA (2).jpg',
      description: 'Criação de anúncios otimizados de alta fidelidade e carrosséis premium com diagramação de extrema elegância.',
      price: '30.000 Kz - 80.000 Kz',
      duration: '3 dias',
      delivery_method: 'E-mail',
      status: 'Em promoção',
      video: '',
      images: JSON.stringify(['/uploads/projects/SOCIAL MEDIA (2).jpg', '/uploads/projects/SOCIAL MEDIA (3).jpg', '/uploads/projects/SOCIAL MEDIA.jpg'])
    },
    {
      title: 'Criativos de Impacto',
      category: 'Design para Redes Sociais',
      image: '/uploads/projects/SOCIAL MEDIA (3).jpg',
      description: 'Combinações tipográficas modernas e paletas cromáticas ousadas para destacar a marca do cliente no mercado.',
      price: '20.000 Kz - 50.000 Kz',
      duration: '3 dias',
      delivery_method: 'Link para download',
      status: 'Disponível',
      video: '',
      images: JSON.stringify(['/uploads/projects/SOCIAL MEDIA (3).jpg', '/uploads/projects/SOCIAL MEDIA (2).jpg', '/uploads/projects/Identidade Visual.jpg'])
    },
    {
      title: 'Filme Publicitário Premium',
      category: 'Motion Design',
      image: '/uploads/projects/MOTION.mp4',
      description: 'Animação promocional cinematográfica em motion graphics, acompanhado de transições inteligentes e edição de elite.',
      price: '40.000 Kz - 110.000 Kz',
      duration: '7 dias',
      delivery_method: 'Google Drive',
      status: 'Mais solicitado',
      video: '/uploads/projects/MOTION.mp4',
      images: JSON.stringify(['/uploads/projects/Identidade Visual.jpg', '/uploads/projects/LOGO.png'])
    },
    {
      title: 'Vídeo Explicativo Moderno',
      category: 'Motion Design',
      image: '/uploads/projects/MOtiom.mp4',
      description: 'Motion design dinâmico gerando alta retenção e facilidade na comunicação de produtos ou serviços complexos.',
      price: '35.000 Kz - 90.000 Kz',
      duration: '7 dias',
      delivery_method: 'Link para download',
      status: 'Disponível',
      video: '/uploads/projects/MOtiom.mp4',
      images: JSON.stringify(['/uploads/projects/SOCIAL MEDIA.jpg', '/uploads/projects/LOGO.png'])
    },
    {
      title: 'Interface Conceito Web',
      category: 'Web Design',
      image: '/uploads/projects/UDX DESIGNER.jpg',
      description: 'Design de interface web minimalista de alta costura, unindo estética impecável com usabilidade exemplar de alto ecrã.',
      price: '80.000 Kz - 250.000 Kz',
      duration: '15 dias',
      delivery_method: 'E-mail',
      status: 'Mais solicitado',
      video: '',
      images: JSON.stringify(['/uploads/projects/UDX DESIGNER.jpg', '/uploads/projects/Identidade Visual.jpg'])
    },
    {
      title: 'Protótipo Animado App',
      category: 'Web Design',
      image: '/uploads/projects/UDX DESIGNER.mp4',
      description: 'Demonstração em vídeo e protótipo interativo mostrando o fluxo de uso, telas e conforto táctil do utilizador.',
      price: '45.000 Kz - 120.000 Kz',
      duration: '7 dias',
      delivery_method: 'Google Drive',
      status: 'Disponível',
      video: '/uploads/projects/UDX DESIGNER.mp4',
      images: JSON.stringify(['/uploads/projects/UDX DESIGNER.jpg'])
    },
    {
      title: 'Microinterações Mobile',
      category: 'Web Design',
      image: '/uploads/projects/UDX DESIGNER (2).mp4',
      description: ' UX táctil voltado ao extremo conforto do usuário em cliques, transições e efeitos de deslize.',
      price: '40.000 Kz - 95.000 Kz',
      duration: '7 dias',
      delivery_method: 'Google Drive',
      status: 'Em promoção',
      video: '/uploads/projects/UDX DESIGNER (2).mp4',
      images: JSON.stringify(['/uploads/projects/UDX DESIGNER.jpg'])
    }
  ];
  const insertProject = db.prepare('INSERT INTO projects (title, category, image, description, price, duration, delivery_method, status, video, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertManyP = db.transaction((projects) => {
    for (const p of projects) {
      insertProject.run(p.title, p.category, p.image, p.description, p.price, p.duration, p.delivery_method, p.status, p.video, p.images);
    }
  });
  insertManyP(initialProjects);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static('uploads'));

// Middleware to verify JWT Token
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Acesso negado' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Token inválido ou sessão expirada' });
    req.user = user as User;
    next();
  });
};

const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Acesso restrito' });
  }
};

// Helper to send notifications
const sendNotification = async (userId: number, title: string, message: string, link?: string) => {
  const result = db.prepare(`
    INSERT INTO notifications (user_id, title, message, link) 
    VALUES (?, ?, ?, ?)
  `).run(userId, title, message, link || null);

  if (io) {
    const newNotification = {
      id: result.lastInsertRowid,
      user_id: userId,
      title,
      message,
      link: link || null,
      is_read: 0,
      created_at: new Date().toISOString()
    };
    io.to(`user_${userId}`).emit('receive_notification', newNotification);
  }
};

// ChatBot Logic
const chatBotResponses = [
  { keywords: ['serviços', 'fazem', 'trabalham'], response: 'Nossos serviços incluem: Desenvolvimento de Apps, Criação de Sites, Design Gráfico, Marketing Digital e Consultoria Tecnológica.' },
  { keywords: ['preço', 'valor', 'custo', 'quanto'], response: 'Os preços variam de acordo com a complexidade do projeto. Entre em contato para um orçamento personalizado!' },
  { keywords: ['contratar', 'como funciona', 'começar'], response: 'Para contratar, basta escolher o serviço desejado em nossa plataforma ou falar diretamente com um de nossos consultores.' },
  { keywords: ['localização', 'onde estão', 'onde ficam'], response: 'Estamos localizados em Luanda, Angola, mas atendemos clientes em todo o mundo de forma remota.' },
  { keywords: ['suporte', 'ajuda', 'atendimento'], response: 'Sim, oferecemos suporte técnico especializado para todos os nossos clientes.' },
  { keywords: ['demora', 'tempo', 'prazo'], response: 'O tempo de entrega depende do serviço. Sites simples levam cerca de 7-15 dias, enquanto apps podem levar de 30-90 dias.' },
  { keywords: ['pagamento', 'como pagar'], response: 'Aceitamos transferências bancárias, pagamentos via Multicaixa Express e cartões de crédito.' },
  { keywords: ['apps', 'aplicativos'], response: 'Sim, desenvolvemos aplicativos nativos e híbridos para iOS e Android.' },
  { keywords: ['sites', 'website', 'página'], response: 'Sim, criamos sites modernos, responsivos e otimizados para SEO.' },
  { keywords: ['promoção', 'desconto', 'oferta'], response: 'Fique atento às nossas redes sociais e à seção de promoções no painel do cliente para descontos exclusivos!' },
  { keywords: ['falar com alguém', 'humano', 'pessoa'], response: 'Vou te encaminhar para um de nossos administradores. Por favor, aguarde um momento.' },
  { keywords: ['contato', 'telefone', 'email'], response: 'Você pode nos contatar pelo WhatsApp (+244 9XX XXX XXX) ou pelo email contato@fenix.com.' },
  { keywords: ['online', 'remoto'], response: 'Sim, realizamos todo o atendimento e entrega de projetos de forma 100% online.' },
  { keywords: ['manutenção', 'atualizar'], response: 'Oferecemos planos de manutenção mensal para garantir que seu sistema esteja sempre atualizado e seguro.' },
  { keywords: ['trabalhos', 'portfólio', 'exemplos'], response: 'Você pode ver nossos trabalhos anteriores na seção "Portfólio" do nosso site.' },
  { keywords: ['garantia'], response: 'Sim, todos os nossos projetos têm garantia contra erros de desenvolvimento por um período determinado.' },
  { keywords: ['entrega'], response: 'A entrega é feita de forma digital, com todo o código-fonte e documentação inclusos.' },
  { keywords: ['empresas', 'corporativo'], response: 'Sim, trabalhamos com empresas de todos os tamanhos, desde startups até grandes corporações.' },
  { keywords: ['olá', 'oi', 'bom dia', 'boa tarde', 'boa noite'], response: 'Olá! Eu sou o assistente virtual da Fenix Innovation. Como posso ajudar você hoje?' },
  { keywords: ['obrigado', 'valeu'], response: 'De nada! Se precisar de mais alguma coisa, estou à disposição.' }
];

function getChatBotResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  for (const item of chatBotResponses) {
    if (item.keywords.some(keyword => lowerMessage.includes(keyword))) {
      return item.response;
    }
  }
  return "No momento não temos uma resposta automática para sua dúvida. Deixe sua mensagem e o nosso administrador entrará em contacto consigo em breve.";
}

// --- API ROUTES ---

app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const user = db.prepare('SELECT id, name, email, role, avatar FROM users WHERE id = ?').get(userId) as any;
    
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const client = db.prepare('SELECT tipo, telefone, nif FROM clients WHERE user_id = ?').get(userId) as any;

    res.json({
      ...user,
      tipo: client?.tipo || 'individual',
      telefone: client?.telefone || '',
      nif: client?.nif || ''
    });
  } catch (error) {
    console.error('Error in /api/me:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// Update Profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  const { name, email, password, avatar, telefone, nif, tipo } = req.body;
  const userId = (req as any).user.id;
  try {
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET name = ?, email = ?, password = ?, avatar = ? WHERE id = ?').run(name, email, hash, avatar, userId);
    } else {
      db.prepare('UPDATE users SET name = ?, email = ?, avatar = ? WHERE id = ?').run(name, email, avatar, userId);
    }

    if (telefone !== undefined || nif !== undefined || tipo !== undefined) {
      const clientExists = db.prepare('SELECT id FROM clients WHERE user_id = ?').get(userId);
      if (clientExists) {
        db.prepare('UPDATE clients SET telefone = COALESCE(?, telefone), nif = COALESCE(?, nif), tipo = COALESCE(?, tipo) WHERE user_id = ?').run(telefone, nif, tipo, userId);
      } else {
        db.prepare('INSERT INTO clients (user_id, tipo, telefone, nif) VALUES (?, ?, ?, ?)').run(userId, tipo || 'individual', telefone || '', nif || '');
      }
    }

    const updatedUser = db.prepare('SELECT id, name, email, role, avatar FROM users WHERE id = ?').get(userId);
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// Projects
app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects').all();
  res.json(projects);
});

app.post('/api/projects', authenticateToken, isAdmin, (req, res) => {
  const { title, category, image, description, price, duration, delivery_method, status, video, images } = req.body;
  const result = db.prepare(`
    INSERT INTO projects (title, category, image, description, price, duration, delivery_method, status, video, images)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    category,
    image,
    description || '',
    price || 'A combinar',
    duration || 'Personalizado',
    delivery_method || 'Google Drive',
    status || 'Disponível',
    video || '',
    images || '[]'
  );
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/projects/:id', authenticateToken, isAdmin, (req, res) => {
  const { title, category, image, description, price, duration, delivery_method, status, video, images } = req.body;
  db.prepare(`
    UPDATE projects 
    SET title = ?, category = ?, image = ?, description = ?, price = ?, duration = ?, delivery_method = ?, status = ?, video = ?, images = ?
    WHERE id = ?
  `).run(
    title,
    category,
    image,
    description || '',
    price || 'A combinar',
    duration || 'Personalizado',
    delivery_method || 'Google Drive',
    status || 'Disponível',
    video || '',
    images || '[]',
    req.params.id
  );
  res.json({ success: true });
});

app.delete('/api/projects/:id', authenticateToken, isAdmin, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Coupons
app.get('/api/coupons', authenticateToken, isAdmin, (req, res) => {
  const coupons = db.prepare('SELECT * FROM coupons').all();
  res.json(coupons);
});

app.post('/api/coupons', authenticateToken, isAdmin, (req, res) => {
  const { code, discount_percentage } = req.body;
  
  if (!code || typeof discount_percentage !== 'number') {
    return res.status(400).json({ error: 'Código e porcentagem de desconto são obrigatórios' });
  }

  if (discount_percentage <= 0 || discount_percentage > 100) {
    return res.status(400).json({ error: 'A porcentagem de desconto deve estar entre 1 e 100' });
  }

  try {
    const result = db.prepare('INSERT INTO coupons (code, discount_percentage) VALUES (?, ?)').run(code.toUpperCase(), discount_percentage);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(400).json({ error: 'Código já existe' });
  }
});

app.put('/api/coupons/:id', authenticateToken, isAdmin, (req, res) => {
  const { active } = req.body;
  db.prepare('UPDATE coupons SET active = ? WHERE id = ?').run(active ? 1 : 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/coupons/:id', authenticateToken, isAdmin, (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/coupons/validate', (req, res) => {
  const { code } = req.body;
  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(code.toUpperCase());
  if (coupon) {
    res.json(coupon);
  } else {
    res.status(404).json({ error: 'Cupom inválido ou expirado' });
  }
});

// Order Chat Messages
app.get('/api/orders/:id/messages', authenticateToken, (req, res) => {
  const orderId = req.params.id;
  const userId = (req as any).user.id;

  // Verify access
  const order = db.prepare(`
    SELECT o.id, u.id as client_user_id 
    FROM orders o 
    JOIN clients c ON o.client_id = c.id 
    JOIN users u ON c.user_id = u.id 
    WHERE o.id = ?
  `).get(orderId) as any;

  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

  const currentUser = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as any;
  if (currentUser.role !== 'admin' && order.client_user_id !== userId) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const messages = db.prepare(`
    SELECT om.*, u.name as sender_name, u.role as sender_role 
    FROM order_messages om 
    JOIN users u ON om.sender_id = u.id 
    WHERE om.order_id = ? 
    ORDER BY om.created_at ASC
  `).all(orderId);

  res.json(messages);
});

app.post('/api/orders/:id/messages', authenticateToken, async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user!.id;
  const role = req.user!.role;
  const { message, file_url, file_name, file_type } = req.body;

  // Verify access
  const order = db.prepare(`
    SELECT o.id, u.id as client_user_id 
    FROM orders o 
    JOIN clients c ON o.client_id = c.id 
    JOIN users u ON c.user_id = u.id 
    WHERE o.id = ?
  `).get(orderId) as any;

  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

  if (role !== 'admin' && order.client_user_id !== userId) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const result = db.prepare(`
    INSERT INTO order_messages (order_id, sender_id, sender_role, message, file_url, file_name, file_type) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(orderId, userId, role, message || '', file_url, file_name, file_type);

  const newMsg = db.prepare(`
    SELECT om.*, u.name as sender_name, u.role as sender_role 
    FROM order_messages om 
    JOIN users u ON om.sender_id = u.id 
    WHERE om.id = ?
  `).get(result.lastInsertRowid) as any;

  // Send notification to the other party
  const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as any;
  const targetUserId = role === 'admin' ? order.client_user_id : adminUser?.id;
  
  if (targetUserId) {
    const link = role === 'admin' ? `/meus-pedidos?orderId=${orderId}` : `/admin?tab=pedidos&orderId=${orderId}`;
    await sendNotification(targetUserId, 'Nova Mensagem', `Você recebeu uma nova mensagem no pedido #${orderId}`, link);
  }

  // Broadcast via socket
  if ((global as any).io) {
    (global as any).io.to(`order_${orderId}`).emit('receive_order_message', newMsg);
  }

  res.status(201).json(newMsg);
});

// Auth
app.post('/api/register', async (req, res) => {
  const { name, email, password, tipo, telefone, nif, mensagem, avatar } = req.body;
  
  try {
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Este e-mail já está em uso.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const role = email === 'fenixinn12@gmail.com' ? 'admin' : 'user';
    
    const result = db.prepare('INSERT INTO users (name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?)').run(name, email, hash, role, avatar || null);
    const userId = Number(result.lastInsertRowid);
    
    if (role !== 'admin') {
      db.prepare('INSERT INTO clients (user_id, tipo, telefone, nif, mensagem, bonus) VALUES (?, ?, ?, ?, ?, ?)').run(userId, tipo || 'individual', telefone || '', nif || '', mensagem || '', 0);
    }

    const token = jwt.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token,
      user: { id: userId, name, email, role, avatar: avatar || null } 
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(400).json({ error: 'Erro ao registrar usuário' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } 
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Memory store for OTPs
const recoveryOtps = new Map<string, { code: string; expires: number; userId: number }>();

app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório.' });
  }

  try {
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number } | undefined;
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado com este e-mail.' });
    }

    // Generate 6-digit numeric OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 15 * 60 * 1000; // 15 minutes expiration

    recoveryOtps.set(email.toLowerCase(), { code, expires, userId: user.id });
    console.log(`[OTP RECOVERY] Code for ${email}: ${code}`);

    res.json({
      success: true,
      message: 'Código de recuperação enviado com sucesso.',
      code: code // Exposed for development/testing ease
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Erro ao gerar código de recuperação.' });
  }
});

app.post('/api/resend-otp', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório.' });
  }

  try {
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number } | undefined;
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 15 * 60 * 1000;

    recoveryOtps.set(email.toLowerCase(), { code, expires, userId: user.id });
    console.log(`[OTP RESEND] Code for ${email}: ${code}`);

    res.json({
      success: true,
      message: 'Novo código gerado com sucesso.',
      code: code
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao reenviar o código.' });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const { email, token } = req.body;
  if (!email || !token) {
    return res.status(400).json({ error: 'E-mail e o código OTP são obrigatórios.' });
  }

  const otpData = recoveryOtps.get(email.toLowerCase());
  if (!otpData) {
    return res.status(400).json({ error: 'Nenhum código ativo para este e-mail. Solicite novamente.' });
  }

  if (Date.now() > otpData.expires) {
    recoveryOtps.delete(email.toLowerCase());
    return res.status(400).json({ error: 'Código expirado. Por favor, solicite um novo.' });
  }

  if (otpData.code !== token) {
    return res.status(400).json({ error: 'Código inválido.' });
  }

  // Generate temporal access token
  const temporaryToken = jwt.sign({ id: otpData.userId, email, role: 'user' }, JWT_SECRET, { expiresIn: '15m' });

  res.json({
    success: true,
    message: 'Código verificado com sucesso.',
    token: temporaryToken,
    user: { id: otpData.userId }
  });
});

app.post('/api/reset-password', async (req, res) => {
  const { password, userId } = req.body;
  
  try {
    if (userId) {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, userId);
    }
    
    res.json({ success: true, message: 'Senha atualizada com sucesso!' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Services
app.get('/api/services', async (req, res) => {
  try {
    const services = db.prepare('SELECT * FROM services ORDER BY id DESC').all();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar serviços' });
  }
});

app.post('/api/services', authenticateToken, isAdmin, async (req, res) => {
  const { nome, preco, descricao, categoria, image, is_promo } = req.body;
  try {
    const result = db.prepare('INSERT INTO services (nome, preco, descricao, categoria, image, is_promo) VALUES (?, ?, ?, ?, ?, ?)').run(nome, preco, descricao, categoria, image, is_promo ? 1 : 0);
    const data = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar serviço' });
  }
});

app.put('/api/services/:id', authenticateToken, isAdmin, async (req, res) => {
  const { nome, preco, descricao, categoria, image, is_promo } = req.body;
  try {
    db.prepare('UPDATE services SET nome = ?, preco = ?, descricao = ?, categoria = ?, image = ?, is_promo = ? WHERE id = ?').run(nome, preco, descricao, categoria, image, is_promo ? 1 : 0, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
});

app.delete('/api/services/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar serviço' });
  }
});

// Orders
app.post('/api/pedidos', authenticateToken, async (req, res) => {
  const { items, total } = req.body;
  const userId = req.user!.id;
  
  try {
    const client = db.prepare('SELECT id FROM clients WHERE user_id = ?').get(userId) as any;

    if (!client) return res.status(400).json({ error: 'Cliente não encontrado' });

    const result = db.prepare('INSERT INTO orders (client_id, total) VALUES (?, ?)').run(client.id, total);
    const orderId = result.lastInsertRowid;

    const insertItem = db.prepare('INSERT INTO order_items (order_id, service_id, quantidade) VALUES (?, ?, ?)');
    const insertMany = db.transaction((items) => {
      for (const item of items) insertItem.run(orderId, item.id, item.quantidade || 1);
    });
    insertMany(items);

    // Notify admin about new order
    const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as any;

    if (adminUser) {
      await sendNotification(adminUser.id, 'Novo Pedido', `Você recebeu um novo pedido #${orderId}`, `/admin?tab=pedidos&orderId=${orderId}`);
    }

    res.json({ success: true, orderId });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Erro ao criar pedido' });
  }
});

app.get('/api/meus-pedidos', authenticateToken, (req, res) => {
  const userId = req.user!.id;
  const limit = parseInt(req.query.limit as string) || 1000;
  const offset = parseInt(req.query.offset as string) || 0;

  const client = db.prepare('SELECT id FROM clients WHERE user_id = ?').get(userId) as any;
  if (!client) return res.json([]);

  const orders = db.prepare(`
    SELECT o.id, o.total, o.status, o.created_at, o.payment_proof, o.attachment, o.client_message, o.admin_message,
    (SELECT COUNT(*) FROM feedbacks WHERE order_id = o.id) > 0 as has_reviewed
    FROM orders o
    WHERE o.client_id = ?
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `).all(client.id, limit, offset);
  
  const ordersWithItems = orders.map((order: any) => {
    const items = db.prepare(`
      SELECT s.nome, oi.quantidade, s.preco
      FROM order_items oi
      JOIN services s ON oi.service_id = s.id
      WHERE oi.order_id = ?
    `).all(order.id);
    return { ...order, items };
  });
  
  res.json(ordersWithItems);
});

app.put('/api/meus-pedidos/:id', authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  const { payment_proof, attachment, client_message } = req.body;
  
  try {
    const client = db.prepare('SELECT id FROM clients WHERE user_id = ?').get(userId) as any;

    if (!client) return res.status(400).json({ error: 'Cliente não encontrado' });

    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND client_id = ?').get(req.params.id, client.id) as any;
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

    let updateQuery = 'UPDATE orders SET ';
    const params: any[] = [];
    const updates: string[] = [];

    if (payment_proof !== undefined) {
      updates.push('payment_proof = ?');
      params.push(payment_proof);
      // If uploading payment proof, change status to 'Aguardando Verificação'
      if (payment_proof && order.status === 'Pendente') {
        updates.push('status = ?');
        params.push('Aguardando Verificação');
      }
    }
    if (attachment !== undefined) {
      updates.push('attachment = ?');
      params.push(attachment);
    }
    if (client_message !== undefined) {
      updates.push('client_message = ?');
      params.push(client_message);
    }

    if (updates.length > 0) {
      updateQuery += updates.join(', ') + ' WHERE id = ?';
      params.push(req.params.id);
      db.prepare(updateQuery).run(...params);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Erro ao atualizar pedido' });
  }
});

app.delete('/api/pedidos/:id', authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  const orderId = req.params.id;

  try {
    const client = db.prepare('SELECT id FROM clients WHERE user_id = ?').get(userId) as any;

    if (!client) return res.status(400).json({ error: 'Cliente não encontrado' });

    const order = db.prepare(`
      SELECT o.id, o.status 
      FROM orders o 
      WHERE o.id = ? AND o.client_id = ?
    `).get(orderId, client.id) as any;

    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (order.status !== 'Pendente') return res.status(400).json({ error: 'Apenas pedidos pendentes podem ser excluídos' });

    db.transaction(() => {
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(orderId);
      db.prepare('DELETE FROM order_messages WHERE order_id = ?').run(orderId);
      db.prepare('DELETE FROM feedbacks WHERE order_id = ?').run(orderId);
      db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
    })();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Erro ao excluir pedido' });
  }
});

app.get('/api/pedidos', authenticateToken, isAdmin, async (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT o.id, o.total, o.status, o.created_at, o.payment_proof, o.attachment, o.client_message, o.admin_message, o.client_id
      FROM orders o
      ORDER BY o.created_at DESC
    `).all();
    
    const clientIds = [...new Set(orders.map((o: any) => o.client_id))];
    if (clientIds.length === 0) return res.json([]);

    const clientsData = db.prepare(`
      SELECT c.id, u.name, u.email, c.telefone, u.avatar
      FROM clients c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.id IN (${clientIds.map(() => '?').join(',')})
    `).all(...clientIds) as any[];

    const clientMap = clientsData.reduce((acc: any, c: any) => {
      acc[c.id] = c;
      return acc;
    }, {});

    const ordersWithItems = orders.map((order: any) => {
      const items = db.prepare(`
        SELECT oi.quantidade, oi.service_id, s.nome, s.preco
        FROM order_items oi
        JOIN services s ON oi.service_id = s.id
        WHERE oi.order_id = ?
      `).all(order.id);
      
      const client = clientMap[order.client_id];
      
      return { 
        ...order, 
        client_name: client?.name || 'Cliente',
        client_email: client?.email || '',
        client_phone: client?.telefone || '',
        items 
      };
    });
    
    res.json(ordersWithItems);
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ error: 'Erro ao buscar pedidos' });
  }
});

app.put('/api/pedidos/:id/status', authenticateToken, isAdmin, async (req, res) => {
  const { status, admin_message } = req.body;
  
  const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(req.params.id) as any;
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

  let updateQuery = 'UPDATE orders SET ';
  const params: any[] = [];
  
  if (status !== undefined && status !== order.status) {
    updateQuery += 'status = ?';
    params.push(status);
    
    // Notify client about status change
    const clientUser = db.prepare(`
      SELECT u.id FROM users u 
      JOIN clients c ON u.id = c.user_id 
      JOIN orders o ON c.id = o.client_id 
      WHERE o.id = ?
    `).get(req.params.id) as any;

    if (clientUser) {
      let title = 'Atualização de Pedido';
      let msg = `O status do seu pedido #${req.params.id} mudou para ${status}`;
      
      if (status === 'Concluído') {
        title = 'Trabalho Concluído! 🎉';
        msg = `O seu pedido #${req.params.id} foi concluído. Verifique os detalhes e baixe seus arquivos.`;
      }

      await sendNotification(clientUser.id, title, msg, `/meus-pedidos?orderId=${req.params.id}`);
    }
  }

  if (admin_message !== undefined) {
    if (status !== undefined && status !== order.status) {
      updateQuery += ', ';
    }
    updateQuery += 'admin_message = ?';
    params.push(admin_message);
  }

  if (params.length > 0) {
    updateQuery += ' WHERE id = ?';
    params.push(req.params.id);
    db.prepare(updateQuery).run(...params);
  }
  
  res.json({ success: true });
});

app.post('/api/pedidos/:id/review', authenticateToken, (req, res) => {
  const { rating, comment, work_image } = req.body;
  const orderId = req.params.id;
  const userId = (req as any).user.id;

  const order = db.prepare(`
    SELECT o.id, o.status FROM orders o
    JOIN clients c ON o.client_id = c.id
    WHERE o.id = ? AND c.user_id = ?
  `).get(orderId, userId) as any;

  if (!order) {
    return res.status(404).json({ error: 'Pedido não encontrado' });
  }

  if (order.status !== 'Concluído') {
    return res.status(400).json({ error: 'Apenas pedidos concluídos podem ser avaliados' });
  }

  const existingReview = db.prepare('SELECT id FROM feedbacks WHERE order_id = ?').get(orderId);
  if (existingReview) {
    return res.status(400).json({ error: 'Pedido já avaliado' });
  }

  // Get the first service_id from the order to link the feedback
  const orderItem = db.prepare('SELECT service_id FROM order_items WHERE order_id = ? LIMIT 1').get(orderId) as any;
  const serviceId = orderItem ? orderItem.service_id : null;

  const imagesJson = work_image ? JSON.stringify(Array.isArray(work_image) ? work_image : [work_image]) : null;

  db.prepare('INSERT INTO feedbacks (user_id, order_id, service_id, rating, comment, work_image) VALUES (?, ?, ?, ?, ?, ?)').run(userId, orderId, serviceId, rating, comment, imagesJson);
  res.json({ success: true });
});

const safeParseImages = (str: string | null) => {
  if (!str) return null;
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    return [str];
  }
};

app.get('/api/reviews', authenticateToken, isAdmin, async (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT f.id, f.rating, f.comment, f.approved, f.created_at, f.work_image, f.user_id, o.id as order_id, u.name as user_name, u.avatar as user_avatar
      FROM feedbacks f
      LEFT JOIN orders o ON f.order_id = o.id
      LEFT JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
    `).all();

    const merged = reviews.map((r: any) => {
      return {
        ...r,
        work_image: safeParseImages(r.work_image)
      };
    });

    res.json(merged);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Erro ao buscar avaliações' });
  }
});

app.put('/api/reviews/:id/visibility', authenticateToken, isAdmin, (req, res) => {
  const { approved } = req.body;
  db.prepare('UPDATE feedbacks SET approved = ? WHERE id = ?').run(approved ? 1 : 0, req.params.id);
  res.json({ success: true });
});

app.get('/api/public-reviews', async (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT f.id, f.rating, f.comment, f.created_at, f.work_image, f.user_id, u.name as user_name, u.avatar as user_avatar
      FROM feedbacks f
      JOIN users u ON f.user_id = u.id
      WHERE f.approved = 1
      ORDER BY f.created_at DESC
      LIMIT 10
    `).all();

    const merged = reviews.map((r: any) => {
      return {
        ...r,
        work_image: safeParseImages(r.work_image)
      };
    });

    res.json(merged);
  } catch (error) {
    console.error('Error fetching public reviews:', error);
    res.status(500).json({ error: 'Erro ao buscar avaliações' });
  }
});

app.post('/api/reset-data', authenticateToken, isAdmin, (req, res) => {
  const { type } = req.body;
  
  try {
    if (type === 'all' || type === 'orders') {
      db.exec('DELETE FROM order_items');
      db.exec('DELETE FROM orders');
    }
    if (type === 'all' || type === 'messages') {
      db.exec('DELETE FROM messages');
    }
    if (type === 'all' || type === 'feedbacks') {
      db.exec('DELETE FROM feedbacks');
    }
    if (type === 'all' || type === 'clients') {
      db.exec('DELETE FROM clients');
      // Delete users that are not admins
      db.exec("DELETE FROM users WHERE role != 'admin'");
    }
    if (type === 'all' || type === 'services') {
      db.exec('DELETE FROM services');
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error resetting data:', error);
    res.status(500).json({ error: 'Erro ao apagar dados' });
  }
});

// Clients
app.get('/api/clientes', authenticateToken, isAdmin, async (req, res) => {
  try {
    const clients = db.prepare(`
      SELECT c.id, u.name, u.email, c.telefone, c.nif, c.mensagem, c.bonus, u.avatar
      FROM clients c
      JOIN users u ON c.user_id = u.id
    `).all();
    
    res.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

app.put('/api/clientes/:id/bonus', authenticateToken, isAdmin, async (req, res) => {
  const { bonus } = req.body;
  try {
    db.prepare('UPDATE clients SET bonus = ? WHERE id = ?').run(bonus, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating client bonus:', error);
    res.status(500).json({ error: 'Erro ao atualizar bónus' });
  }
});

// Removed redundant order chat routes

app.get('/api/notifications', authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  
  // Fallback to SQLite
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  res.json(notifications);
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  const notificationId = req.params.id;

  // SQLite
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(notificationId, userId);
  res.json({ success: true });
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  const userId = req.user!.id;

  // SQLite
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
  res.json({ success: true });
});

app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  const notificationId = req.params.id;

  // SQLite
  db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(notificationId, userId);
  res.json({ success: true });
});

app.delete('/api/notifications/delete-all', authenticateToken, async (req, res) => {
  const userId = req.user!.id;

  // SQLite
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
  res.json({ success: true });
});

// Messages
app.post('/api/mensagens', (req, res) => {
  const { name, email, message } = req.body;
  const result = db.prepare('INSERT INTO messages (name, email, message) VALUES (?, ?, ?)').run(name, email, message);
  res.json({ success: true, id: result.lastInsertRowid });
});

app.get('/api/mensagens', authenticateToken, isAdmin, (req, res) => {
  const messages = db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
  res.json(messages);
});

// Feedbacks
app.post('/api/feedbacks', authenticateToken, (req, res) => {
  const { service_id, rating, comment } = req.body;
  const user_id = (req as any).user.id;
  try {
    const result = db.prepare('INSERT INTO feedbacks (user_id, service_id, rating, comment) VALUES (?, ?, ?, ?)').run(user_id, service_id || null, rating, comment);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar feedback' });
  }
});

app.get('/api/feedbacks', authenticateToken, isAdmin, (req, res) => {
  const feedbacks = db.prepare(`
    SELECT f.*, u.name as user_name, u.avatar as user_avatar, s.nome as service_name
    FROM feedbacks f
    JOIN users u ON f.user_id = u.id
    LEFT JOIN services s ON f.service_id = s.id
    ORDER BY f.created_at DESC
  `).all().map((f: any) => ({
    ...f,
    work_image: safeParseImages(f.work_image)
  }));
  res.json(feedbacks);
});

app.get('/api/feedbacks/public', (req, res) => {
  const feedbacks = db.prepare(`
    SELECT f.id, f.rating, f.comment, f.created_at, f.work_image, f.service_id, u.name as user_name, u.avatar as user_avatar, s.nome as service_name
    FROM feedbacks f
    JOIN users u ON f.user_id = u.id
    LEFT JOIN services s ON f.service_id = s.id
    WHERE f.approved = 1
    ORDER BY f.created_at DESC
  `).all().map((f: any) => ({
    ...f,
    work_image: safeParseImages(f.work_image)
  }));
  res.json(feedbacks);
});

app.put('/api/feedbacks/:id/approve', authenticateToken, isAdmin, (req, res) => {
  const { approved } = req.body;
  db.prepare('UPDATE feedbacks SET approved = ? WHERE id = ?').run(approved ? 1 : 0, req.params.id);
  res.json({ success: true });
});

app.put('/api/feedbacks/:id/image', authenticateToken, isAdmin, (req, res) => {
  const { work_image } = req.body;
  const imagesJson = work_image ? JSON.stringify(Array.isArray(work_image) ? work_image : [work_image]) : null;
  db.prepare('UPDATE feedbacks SET work_image = ? WHERE id = ?').run(imagesJson, req.params.id);
  res.json({ success: true });
});

app.delete('/api/feedbacks/:id', authenticateToken, isAdmin, (req, res) => {
  db.prepare('DELETE FROM feedbacks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/stats', authenticateToken, isAdmin, (req, res) => {
  const totalClients = db.prepare('SELECT COUNT(*) as count FROM clients').get() as any;
  const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get() as any;
  const totalRevenue = db.prepare('SELECT SUM(total) as sum FROM orders').get() as any;
  
  res.json({
    clients: totalClients.count,
    orders: totalOrders.count,
    revenue: totalRevenue.sum || 0
  });
});

app.get('/api/stats/charts', authenticateToken, isAdmin, (req, res) => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  const revenueData = db.prepare(`
    SELECT strftime('%m', created_at) as month, SUM(total) as total 
    FROM orders 
    WHERE status = 'Concluído'
    GROUP BY month 
    ORDER BY month
  `).all() as any[];

  const formattedRevenue = months.map((month, index) => {
    const monthNum = (index + 1).toString().padStart(2, '0');
    const found = revenueData.find(d => d.month === monthNum);
    return {
      name: month,
      total: found ? found.total : 0
    };
  });

  const statusData = db.prepare(`
    SELECT status as name, COUNT(*) as value 
    FROM orders 
    GROUP BY status
  `).all();

  res.json({
    revenueByMonth: formattedRevenue,
    ordersByStatus: statusData
  });
});

// AI Chatbot Setup
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const isPlaceholderKey = GEMINI_API_KEY === 'MY_GEMINI_API_KEY' || GEMINI_API_KEY === '';

if (isPlaceholderKey) {
  console.warn('WARNING: GEMINI_API_KEY is not set or is using a placeholder value. AI Chatbot will be disabled.');
}

const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

app.post('/api/chatbot/save', async (req, res) => {
  const { session_id, sender_role, message, sender_id } = req.body;
  try {
    db.prepare('INSERT INTO general_chat_messages (session_id, sender_role, message, sender_id) VALUES (?, ?, ?, ?)').run(
      session_id,
      sender_role,
      message,
      sender_id || null
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao guardar mensagem' });
  }
});

app.post('/api/chatbot', async (req, res) => {
  const { message, sessionId } = req.body;
  
  const systemInstruction = `Você é o Co-Piloto e Assistente Virtual oficial da Fênix Innovation, uma agência especializada em design, identidade visual de alto padrão e tecnologia.

Seu escopo de atendimento é ESTREITO E EXCLUSIVAMENTE LIMITADO às seguintes áreas da Fênix Innovation:
1. Serviços de Design e Tecnologia:
   - Design para Redes Sociais, Design Gráfico, Identidade Visual (Logos, branding completo), Motion Design, Web Design, Desenvolvimento de Websites (institucionais, e-commerce), Desenvolvimento de Aplicativos Móveis (iOS & Android), Marketing Digital, Direção de Arte e Impressão Gráfica.
2. Produtos e Sistema:
   - Portfólio, Projetos criados, Pedidos de serviços, Orçamentos integrados, Perfil do utilizador, Conta do cliente, Histórico de compras, Catálogo de soluções, Configurações de conta, Pagamentos e prazos de Entregas.
3. Funcionalidades da Plataforma Fênix Innovation:
   - Cadastro de contas, Login seguro, Alterar senha, Recuperar senha esquecida, Atualizar perfil e dados de contacto, Upload de arquivos/imagens anexas aos layouts, Acompanhamento integrado de projetos em tempo real, Histórico de pedidos colocados.

DIRETRIZES DE SEGURANÇA E RESTRIÇÃO ABSOLUTAS:
- Você está TERMINANTEMENTE PROIBIDO de responder a perguntas sobre quaisquer assuntos fora deste escopo da nossa plataforma ou empresa.
- Isso inclui proibições absolutas para responder sobre: Política, Futebol/Esportes, Medicina/Saúde, Notícias mundiais, Religião, Redação de códigos de programação genéricos e externos, Assuntos pessoais do utilizador ou de terceiros, ou qualquer outro tema externo à Fênix Innovation.
- Caso o utilizador faça qualquer pergunta fora dessas do escopo permitido, você DEVE retornar estritamente e exclusivamente a seguinte mensagem literal:
"Sou o Assistente Virtual da Fénix Innovation e fui desenvolvido exclusivamente para fornecer suporte sobre os serviços, produtos e funcionalidades da plataforma."
- Não dê justificativas, não peça desculpas extras, não crie diálogos fora do padrão. Responda apenas com a frase exata designada para fora de escopo.
- Se o usuário não encontrar o que procura no catálogo de serviços, responda de forma cordial: 'Caso não tenha encontrado o que procura, podemos analisar e adicionar para si.'
- Responda em Português de Portugal ou de forma neutra, sempre mantendo um tom altamente polido, elegante, prestativo e cordial.`;

  let aiText = "";

  // Use Gemini as the primary model
  if (!isPlaceholderKey) {
    try {
      const response = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: message,
        config: {
          systemInstruction: systemInstruction,
        }
      });
      aiText = response.text || "";
    } catch (error: any) {
      console.error('Gemini error:', error.message);
      return res.json({ 
        text: "Ocorreu um erro ao comunicar com o serviço de IA. Verifique se a sua chave de API é válida.",
        error: "AI_ERROR",
        details: error.message
      });
    }
  } else {
    return res.json({ 
      text: "O ChatBot está offline porque a GEMINI_API_KEY não foi configurada. Por favor, adicione a sua chave nos Segredos (Secrets) nas definições do projeto.",
      error: "MISSING_API_KEY"
    });
  }

  if (!aiText) {
    return res.json({ 
      text: "Desculpe, o serviço de IA não devolveu uma resposta. Por favor, tente novamente mais tarde.",
      error: "AI_EMPTY_RESPONSE"
    });
  }

  // Save AI response to DB if sessionId is provided
  if (sessionId) {
    try {
      db.prepare('INSERT INTO general_chat_messages (session_id, sender_role, message) VALUES (?, ?, ?)').run(
        sessionId,
        'ai',
        aiText
      );
    } catch (dbErr) {
      console.error('Error saving AI message to DB:', dbErr);
    }
  }

  res.json({ text: aiText });
});

app.get('/api/chat/history/:sessionId', (req, res) => {
  const messages = db.prepare('SELECT * FROM general_chat_messages WHERE session_id = ? ORDER BY created_at ASC').all(req.params.sessionId);
  res.json(messages);
});

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum ficheiro enviado' });
  }
  
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ 
    url: fileUrl,
    name: req.file.originalname,
    type: req.file.mimetype
  });
});

app.get('/api/admin/chats', authenticateToken, isAdmin, (req, res) => {
  const chats = db.prepare(`
    SELECT 
      g.session_id, 
      MAX(g.created_at) as last_msg,
      (SELECT u.name FROM users u JOIN general_chat_messages g2 ON u.id = g2.sender_id WHERE g2.session_id = g.session_id AND g2.sender_role = 'user' LIMIT 1) as user_name,
      (SELECT u.avatar FROM users u JOIN general_chat_messages g2 ON u.id = g2.sender_id WHERE g2.session_id = g.session_id AND g2.sender_role = 'user' LIMIT 1) as user_avatar,
      (SELECT message FROM general_chat_messages g3 WHERE g3.session_id = g.session_id ORDER BY created_at DESC LIMIT 1) as last_message_text
    FROM general_chat_messages g
    GROUP BY g.session_id
    ORDER BY last_msg DESC
  `).all();
  res.json(chats);
});

app.delete('/api/chat/message/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { type } = req.body; // 'self' or 'all'
  const userId = (req as any).user.id;

  try {
    if (type === 'all') {
      // Check if user is admin or sender
      const msg = db.prepare('SELECT * FROM general_chat_messages WHERE id = ?').get(id) as any;
      if (!msg) return res.status(404).json({ error: 'Mensagem não encontrada' });
      
      if ((req as any).user.role !== 'admin' && msg.sender_id !== userId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      db.prepare("UPDATE general_chat_messages SET message = 'Esta mensagem foi eliminada', sender_role = 'ai' WHERE id = ?").run(id);
    } else {
      // For 'self', we don't really have a 'deleted_by' in general_chat_messages yet
      // but we can just delete it from DB if it's the sender
      db.prepare('DELETE FROM general_chat_messages WHERE id = ? AND sender_id = ?').run(id, userId);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao eliminar mensagem' });
  }
});

async function startServer() {
  const PORT = 3000;
  const server = http.createServer(app);
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  (global as any).io = io;

  // Track online admins
  const onlineAdmins = new Set();

  io.on('connection', (socket) => {
    socket.on('join', (data) => {
      if (data.role === 'admin') {
        onlineAdmins.add(socket.id);
        io.emit('admin_status', { online: true });
      } else {
        // Tell the user if an admin is already online
        socket.emit('admin_status', { online: onlineAdmins.size > 0 });
      }
      socket.join(data.room || 'general');
    });

    socket.on('send_message', (data) => {
      // Save to DB
      const { sender_id, session_id, sender_role, message, file_url, file_name, file_type } = data;
      const result = db.prepare('INSERT INTO general_chat_messages (sender_id, session_id, sender_role, message) VALUES (?, ?, ?, ?)').run(
        sender_id || null,
        session_id,
        sender_role,
        message
      );
      
      data.id = result.lastInsertRowid;

      // Broadcast to specific room and general room
      const room = data.room || 'general';
      io.to(room).emit('receive_message', data);
      if (room !== 'general') {
        io.to('general').emit('receive_message', data);
      }
      
      // If no admin is online and it's a user message, we could trigger AI here or let frontend handle it
      if (sender_role === 'user' && onlineAdmins.size === 0) {
        socket.emit('admin_status', { online: false });
      }
    });

    socket.on('delete_message', (data) => {
      const { messageId, type, room } = data;
      io.to(room).emit('message_deleted', { messageId, type });
      if (room !== 'general') {
        io.to('general').emit('message_deleted', { messageId, type });
      }
    });

    socket.on('disconnect', () => {
      if (onlineAdmins.has(socket.id)) {
        onlineAdmins.delete(socket.id);
        if (onlineAdmins.size === 0) {
          io.emit('admin_status', { online: false });
        }
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
