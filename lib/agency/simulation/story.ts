/**
 * A história que a simulação conta: clientes fictícios, o que cada contrato
 * prevê, os temas de conteúdo, os pedidos extras e os projetos do trimestre.
 * Tudo aqui é texto e datas; a mecânica fica em `quarter-plan.ts`.
 */

export type ContentKind = "estatico" | "carrossel" | "stories" | "reels" | "video" | "trafego";

export type SimServiceSpec = { name: string; quantity: number; kind: ContentKind };

export type SimClientSpec = {
  key: string;
  abbr: string;
  name: string;
  legalName: string;
  segment: string;
  email: string;
  phone: string;
  city: string;
  brandColor: string;
  plan: string;
  /** Dia em que o contrato começou (`AAAA-MM-DD`). */
  startedOn: string;
  renewalDay: number;
  tone: string;
  cta: string;
  services: SimServiceSpec[];
  themes: Partial<Record<ContentKind, string[]>>;
  /** Cliente novo no trimestre: o início tem mais ajustes até a equipe pegar o jeito. */
  onboarding?: boolean;
  /** Cliente mais exigente com revisão. */
  demanding?: boolean;
};

export const SIM_CLIENTS: SimClientSpec[] = [
  {
    key: "aurora",
    abbr: "AUR",
    name: "Clínica Aurora Odontologia",
    legalName: "Aurora Odontologia Integrada LTDA",
    segment: "Odontologia",
    email: "contato@clinicaaurora.example",
    phone: "(11) 5550-0101",
    city: "São Paulo",
    brandColor: "#0ea5e9",
    plan: "Plano Essencial",
    startedOn: "2026-01-12",
    renewalDay: 12,
    tone: "acolhedor e didático",
    cta: "Agende sua avaliação pelo WhatsApp",
    services: [
      { name: "Feeds estáticos", quantity: 8, kind: "estatico" },
      { name: "Carrosséis", quantity: 4, kind: "carrossel" },
      { name: "Stories", quantity: 12, kind: "stories" },
      { name: "Gestão de tráfego pago", quantity: 1, kind: "trafego" },
    ],
    themes: {
      estatico: [
        "Clareamento dental: o que é mito e o que é verdade",
        "Conheça a equipe de dentistas",
        "Depoimento de paciente: sorriso novo",
        "Dica de escovação para a semana",
        "Antes e depois de lentes de contato",
        "Quando trocar a escova de dentes",
        "Check-up semestral: por que não pular",
        "Bastidores da clínica",
      ],
      carrossel: [
        "5 hábitos que mancham os dentes",
        "Passo a passo de um tratamento de canal",
        "Aparelho fixo, alinhador ou lentes: como escolher",
        "Cuidados com a saúde bucal das crianças",
        "Perguntas frequentes sobre implantes",
      ],
      stories: [
        "enquete: qual dúvida você quer ver respondida",
        "bastidores do atendimento",
        "caixinha de perguntas com a dentista",
        "dica rápida de higiene bucal",
        "agenda aberta da semana",
      ],
      trafego: ["Campanha de avaliação gratuita — otimização mensal"],
    },
  },
  {
    key: "vita",
    abbr: "VIT",
    name: "Studio Vita Pilates",
    legalName: "Vita Movimento e Saúde LTDA",
    segment: "Pilates e bem-estar",
    email: "oi@studiovita.example",
    phone: "(19) 5550-0102",
    city: "Campinas",
    brandColor: "#f97316",
    plan: "Plano Performance",
    startedOn: "2026-02-02",
    renewalDay: 2,
    tone: "motivador e leve",
    cta: "Reserve sua aula experimental",
    services: [
      { name: "Feeds estáticos", quantity: 10, kind: "estatico" },
      { name: "Reels", quantity: 4, kind: "reels" },
      { name: "Stories", quantity: 8, kind: "stories" },
      { name: "Gestão de tráfego pago", quantity: 1, kind: "trafego" },
    ],
    themes: {
      estatico: [
        "Pilates para quem trabalha sentado",
        "Horários e turmas da semana",
        "Aluna da semana: história de superação",
        "Benefícios do pilates para a postura",
        "Mitos sobre pilates",
        "Conheça os aparelhos do studio",
        "Alongamento de 5 minutos para o dia a dia",
        "Plano de aulas: quantas vezes por semana",
        "Respiração: o primeiro princípio do método",
        "Nova turma de manhã",
      ],
      reels: [
        "exercício do dia em 30 segundos",
        "tour pelo studio",
        "depoimento de aluna",
        "erros comuns na prancha",
        "aula experimental: como funciona",
      ],
      stories: [
        "enquete: qual aula você prefere",
        "bastidores da aula",
        "vagas abertas da semana",
        "dica de postura",
      ],
      trafego: ["Campanha de aula experimental — otimização mensal"],
    },
  },
  {
    key: "doce",
    abbr: "DOC",
    name: "Doce Raiz Confeitaria",
    legalName: "Doce Raiz Alimentos Artesanais LTDA",
    segment: "Confeitaria artesanal",
    email: "encomendas@doceraiz.example",
    phone: "(11) 5550-0103",
    city: "São Paulo",
    brandColor: "#ec4899",
    plan: "Plano Essencial",
    startedOn: "2026-03-02",
    renewalDay: 2,
    tone: "afetivo e apetitoso",
    cta: "Encomende pelo link da bio",
    services: [
      { name: "Feeds estáticos", quantity: 8, kind: "estatico" },
      { name: "Stories", quantity: 8, kind: "stories" },
      { name: "Reels", quantity: 2, kind: "reels" },
    ],
    themes: {
      estatico: [
        "Bolo do mês: sabor e ingredientes",
        "Brigadeiros gourmet: caixa presente",
        "Bastidores da cozinha",
        "Como encomendar: passo a passo",
        "Tortas geladas para o fim de semana",
        "Cliente feliz: foto de encomenda",
        "Ingredientes que fazem a diferença",
        "Cardápio da semana",
      ],
      stories: [
        "enquete: qual sabor entra no cardápio",
        "bastidores da produção",
        "últimas vagas de encomenda",
        "mostrando a decoração do bolo",
      ],
      reels: ["receita rápida em 30 segundos", "do forno à caixa: o making of"],
    },
  },
  {
    key: "mendes",
    abbr: "MEP",
    name: "Mendes & Prado Advogados",
    legalName: "Mendes e Prado Sociedade de Advogados",
    segment: "Advocacia de família e sucessões",
    email: "atendimento@mendesprado.example",
    phone: "(11) 5550-0104",
    city: "Santo André",
    brandColor: "#1e3a8a",
    plan: "Plano Autoridade",
    startedOn: "2026-04-06",
    renewalDay: 6,
    tone: "sóbrio e acessível",
    cta: "Fale com um especialista",
    demanding: true,
    services: [
      { name: "Carrosséis", quantity: 6, kind: "carrossel" },
      { name: "Feeds estáticos", quantity: 4, kind: "estatico" },
      { name: "Vídeos institucionais", quantity: 2, kind: "video" },
    ],
    themes: {
      carrossel: [
        "O que é inventário e quando abrir",
        "Divórcio consensual: etapas e prazos",
        "Guarda compartilhada: direitos e deveres",
        "Pensão alimentícia: como funciona o cálculo",
        "Planejamento sucessório: por que começar cedo",
        "União estável: como formalizar",
        "Testamento: mitos e verdades",
      ],
      estatico: [
        "Apresentação da equipe de sócios",
        "Dúvida do mês respondida",
        "Horário de atendimento e canais",
        "Indicação de leitura jurídica do mês",
      ],
      video: [
        "Sócia explica o planejamento sucessório",
        "Perguntas frequentes sobre divórcio",
        "Bastidores: como funciona a primeira consulta",
      ],
    },
  },
  {
    key: "terra",
    abbr: "TVI",
    name: "Terra Viva Imóveis",
    legalName: "Terra Viva Empreendimentos Imobiliários LTDA",
    segment: "Imobiliário",
    email: "vendas@terraviva.example",
    phone: "(15) 5550-0105",
    city: "Sorocaba",
    brandColor: "#16a34a",
    plan: "Plano Completo",
    startedOn: "2026-08-03",
    renewalDay: 3,
    tone: "confiante e aspiracional",
    cta: "Agende uma visita ao decorado",
    onboarding: true,
    services: [
      { name: "Feeds estáticos", quantity: 8, kind: "estatico" },
      { name: "Reels", quantity: 6, kind: "reels" },
      { name: "Stories", quantity: 8, kind: "stories" },
      { name: "Vídeos institucionais", quantity: 2, kind: "video" },
      { name: "Gestão de tráfego pago", quantity: 1, kind: "trafego" },
    ],
    themes: {
      estatico: [
        "Planta do apartamento de 2 quartos",
        "Diferenciais do condomínio",
        "Localização e entorno do Vista Verde",
        "Condições de entrada facilitada",
        "Áreas de lazer do residencial",
        "Corretor responde: financiamento passo a passo",
        "Obra em andamento: atualização do mês",
        "Depoimento de comprador",
      ],
      reels: [
        "tour pelo decorado",
        "um dia no canteiro de obras",
        "a vista do 12º andar",
        "como funciona o financiamento",
        "conheça o bairro",
        "perguntas rápidas ao corretor",
      ],
      stories: [
        "enquete: planta preferida",
        "plantão de vendas ao vivo",
        "contagem para o evento",
        "bastidores da obra",
      ],
      video: [
        "Vídeo institucional do empreendimento",
        "Vídeo de apresentação da construtora",
        "Visita guiada ao decorado",
      ],
      trafego: ["Campanha de captação de leads — otimização mensal"],
    },
  },
];

/** Pedidos fora do contrato: quase sempre urgentes e ligados a uma data real. */
export type SimExtraSpec = {
  client: string;
  /** Dia do pedido. */
  on: string;
  kind: ContentKind;
  title: string;
  brief: string;
  priority: "Média" | "Alta" | "Urgente";
  dueInBusinessDays: number;
};

export const SIM_EXTRAS: SimExtraSpec[] = [
  { client: "aurora", on: "2026-07-08", kind: "estatico", title: "Arte — Horários especiais nas férias escolares", brief: "Aviso de horário estendido para atender famílias nas férias.", priority: "Alta", dueInBusinessDays: 3 },
  { client: "vita", on: "2026-07-15", kind: "estatico", title: "Arte — Aulão aberto de sábado", brief: "Divulgar o aulão gratuito com vagas limitadas.", priority: "Urgente", dueInBusinessDays: 2 },
  { client: "doce", on: "2026-07-22", kind: "estatico", title: "Arte — Cardápio de inverno: chocolate quente e fondue", brief: "Lançamento do cardápio sazonal com foto de produto.", priority: "Alta", dueInBusinessDays: 3 },
  { client: "mendes", on: "2026-07-29", kind: "carrossel", title: "Carrossel — Quando contratar um advogado de família", brief: "Conteúdo de autoridade pedido pelos sócios após atendimento.", priority: "Média", dueInBusinessDays: 5 },
  { client: "terra", on: "2026-08-04", kind: "estatico", title: "Arte — Anúncio de abertura da Terra Viva", brief: "Peça de apresentação da imobiliária para o lançamento do Vista Verde.", priority: "Urgente", dueInBusinessDays: 2 },
  { client: "doce", on: "2026-08-05", kind: "estatico", title: "Arte — Combo Dia dos Pais", brief: "Combo especial para o Dia dos Pais (9/8) com encomenda até quinta.", priority: "Urgente", dueInBusinessDays: 2 },
  { client: "vita", on: "2026-08-19", kind: "reels", title: "Reel — Depoimento: 3 meses de pilates", brief: "Aluna conta a evolução em três meses; material gravado no studio.", priority: "Alta", dueInBusinessDays: 4 },
  { client: "aurora", on: "2026-08-26", kind: "estatico", title: "Arte — Campanha de clareamento: condição de setembro", brief: "Condição especial de clareamento válida até o fim de setembro.", priority: "Alta", dueInBusinessDays: 3 },
  { client: "terra", on: "2026-09-02", kind: "estatico", title: "Banner — Plantão de vendas no fim de semana", brief: "Plantão no decorado do Vista Verde, sábado e domingo.", priority: "Urgente", dueInBusinessDays: 2 },
  { client: "mendes", on: "2026-09-09", kind: "estatico", title: "Arte — Plantão de dúvidas sobre inventário", brief: "Dia de atendimento aberto com os sócios.", priority: "Média", dueInBusinessDays: 4 },
  { client: "vita", on: "2026-09-16", kind: "estatico", title: "Arte — Desafio 21 dias: abertura de inscrições", brief: "Abertura das inscrições do desafio de verão.", priority: "Alta", dueInBusinessDays: 3 },
  { client: "doce", on: "2026-09-23", kind: "estatico", title: "Arte — Encomendas de Dia das Crianças abertas", brief: "Kits de festa e caixas temáticas para 12/10.", priority: "Alta", dueInBusinessDays: 3 },
  { client: "aurora", on: "2026-09-30", kind: "estatico", title: "Arte — Outubro Rosa: check-up e saúde bucal", brief: "Parceria com a campanha do mês: check-up com condição especial.", priority: "Média", dueInBusinessDays: 4 },
  { client: "terra", on: "2026-10-02", kind: "estatico", title: "Arte — Condição especial de outubro", brief: "Entrada facilitada para unidades do Vista Verde até 31/10.", priority: "Urgente", dueInBusinessDays: 2 },
  { client: "doce", on: "2026-10-05", kind: "estatico", title: "Arte — Promoção relâmpago de Dia das Crianças", brief: "Desconto de 15% no kit festa nas encomendas até quarta.", priority: "Urgente", dueInBusinessDays: 2 },
];

/** Trabalho de projeto: pedidos com prazo próprio, ligados a uma entrega maior do cliente. */
export type SimProjectTask = {
  /** Item do checklist do projeto a que a tarefa pertence. */
  item: number;
  on: string;
  due: string;
  kind: ContentKind;
  title: string;
  brief: string;
};

export type SimProjectSpec = {
  client: string;
  title: string;
  description: string;
  startsOn: string;
  dueOn: string;
  checklist: string[];
  tasks: SimProjectTask[];
};

export const SIM_PROJECTS: SimProjectSpec[] = [
  {
    client: "terra",
    title: "Lançamento do residencial Vista Verde",
    description:
      "Campanha de lançamento do Vista Verde: conteúdo do decorado, vídeo institucional, evento de abertura e mídia paga.",
    startsOn: "2026-08-03",
    dueOn: "2026-09-30",
    checklist: [
      "Vídeo institucional do empreendimento",
      "Série de reels de lançamento",
      "Peças de plantas e convite do evento",
      "Campanha de tráfego de lançamento",
      "Cobertura do evento de abertura",
    ],
    tasks: [
      { item: 0, on: "2026-08-05", due: "2026-08-28", kind: "video", title: "Vídeo institucional do Vista Verde", brief: "Vídeo de 90 segundos com o conceito do empreendimento, imagens do decorado e depoimento do incorporador." },
      { item: 1, on: "2026-08-10", due: "2026-08-19", kind: "reels", title: "Reel de lançamento — tour pelo decorado", brief: "Tour do decorado com foco nos ambientes sociais." },
      { item: 1, on: "2026-08-10", due: "2026-08-24", kind: "reels", title: "Reel de lançamento — plantas e metragens", brief: "Comparativo das plantas disponíveis, com metragem e valores de entrada." },
      { item: 1, on: "2026-08-10", due: "2026-08-31", kind: "reels", title: "Reel de lançamento — localização e entorno", brief: "Mapa animado com mercados, escolas e vias de acesso." },
      { item: 2, on: "2026-08-12", due: "2026-08-19", kind: "estatico", title: "Arte — tabela de plantas do Vista Verde", brief: "Peça com as plantas de 2 e 3 quartos para o material de vendas." },
      { item: 3, on: "2026-08-17", due: "2026-08-31", kind: "trafego", title: "Campanha de lançamento — estrutura e públicos", brief: "Estrutura de campanha de leads, públicos por região e criativos aprovados." },
      { item: 2, on: "2026-09-01", due: "2026-09-08", kind: "estatico", title: "Arte — convite digital do evento de abertura", brief: "Convite para o evento de abertura de 12/9, com confirmação por WhatsApp." },
      { item: 4, on: "2026-09-02", due: "2026-09-14", kind: "reels", title: "Reel — cobertura do evento de abertura", brief: "Melhores momentos do evento, com depoimentos de visitantes." },
      { item: 3, on: "2026-09-10", due: "2026-09-24", kind: "trafego", title: "Campanha de lançamento — otimização pós-evento", brief: "Rever públicos e orçamento depois do evento de abertura." },
    ],
  },
  {
    client: "vita",
    title: "Desafio 21 dias — edição de verão",
    description:
      "Campanha de captação de alunos: desafio de 21 dias com identidade própria, conteúdo de chamada e mídia paga.",
    startsOn: "2026-09-14",
    dueOn: "2026-11-13",
    checklist: [
      "Identidade e regras do desafio",
      "Conteúdo de chamada (reels)",
      "Campanha de inscrições",
      "Conteúdo de acompanhamento e encerramento",
    ],
    tasks: [
      { item: 0, on: "2026-09-14", due: "2026-09-24", kind: "estatico", title: "Identidade visual do Desafio 21 dias", brief: "Marca do desafio, paleta de verão e modelo de peça." },
      { item: 0, on: "2026-09-16", due: "2026-09-28", kind: "carrossel", title: "Carrossel — regras e cronograma do desafio", brief: "Como funciona, calendário das 3 semanas e o que está incluso." },
      { item: 1, on: "2026-09-21", due: "2026-10-02", kind: "reels", title: "Reel — chamada para o desafio", brief: "Convite curto com a professora, aproveitando material da captação de setembro." },
      { item: 1, on: "2026-09-21", due: "2026-10-09", kind: "reels", title: "Reel — depoimento de aluna sobre o desafio", brief: "Depoimento da aluna que fez a edição anterior." },
      { item: 2, on: "2026-10-01", due: "2026-10-09", kind: "trafego", title: "Campanha de inscrições do desafio", brief: "Campanha de conversão para a lista de inscrição, orçamento diário aprovado." },
      { item: 3, on: "2026-10-05", due: "2026-10-14", kind: "stories", title: "Kit de stories — contagem regressiva", brief: "Sequência de stories para os 7 dias antes da abertura." },
      { item: 3, on: "2026-10-05", due: "2026-11-06", kind: "video", title: "Vídeo de encerramento do desafio", brief: "Aftermovie com os melhores momentos das 3 semanas." },
    ],
  },
];

/** Captações: `on` é o dia; futuras ficam planejadas ou confirmadas. */
export type SimShootSpec = {
  client: string;
  on: string;
  title: string;
  location: string;
  start: string;
  end: string;
  type: string;
};

export const SIM_SHOOTS: SimShootSpec[] = [
  { client: "vita", on: "2026-07-14", title: "Captação mensal — Studio Vita (julho)", location: "Studio Vita — Campinas", start: "09:00", end: "12:00", type: "Mensal" },
  { client: "vita", on: "2026-08-11", title: "Captação mensal — Studio Vita (agosto)", location: "Studio Vita — Campinas", start: "09:00", end: "12:00", type: "Mensal" },
  { client: "vita", on: "2026-09-08", title: "Captação mensal — Studio Vita (setembro)", location: "Studio Vita — Campinas", start: "09:00", end: "12:30", type: "Mensal" },
  { client: "vita", on: "2026-10-13", title: "Captação mensal — Studio Vita (outubro)", location: "Studio Vita — Campinas", start: "09:00", end: "12:00", type: "Mensal" },
  { client: "doce", on: "2026-07-21", title: "Captação de produtos — Doce Raiz (inverno)", location: "Cozinha Doce Raiz — São Paulo", start: "14:00", end: "17:00", type: "Produto" },
  { client: "doce", on: "2026-09-22", title: "Captação de produtos — Doce Raiz (Dia das Crianças)", location: "Cozinha Doce Raiz — São Paulo", start: "14:00", end: "17:00", type: "Produto" },
  { client: "mendes", on: "2026-07-16", title: "Gravação institucional — Mendes & Prado (julho)", location: "Escritório Mendes & Prado — Santo André", start: "10:00", end: "13:00", type: "Institucional" },
  { client: "mendes", on: "2026-09-17", title: "Gravação institucional — Mendes & Prado (setembro)", location: "Escritório Mendes & Prado — Santo André", start: "10:00", end: "13:00", type: "Institucional" },
  { client: "mendes", on: "2026-10-22", title: "Gravação institucional — Mendes & Prado (outubro)", location: "Escritório Mendes & Prado — Santo André", start: "10:00", end: "13:00", type: "Institucional" },
  { client: "terra", on: "2026-08-10", title: "Captação do decorado — Vista Verde", location: "Decorado Vista Verde — Sorocaba", start: "08:30", end: "13:00", type: "Lançamento" },
  { client: "terra", on: "2026-08-25", title: "Captação de obra e entorno — Vista Verde", location: "Residencial Vista Verde — Sorocaba", start: "09:00", end: "12:00", type: "Lançamento" },
  { client: "terra", on: "2026-09-12", title: "Cobertura do evento de abertura — Vista Verde", location: "Residencial Vista Verde — Sorocaba", start: "09:00", end: "15:00", type: "Evento" },
  { client: "terra", on: "2026-10-06", title: "Captação mensal — Terra Viva (outubro)", location: "Decorado Vista Verde — Sorocaba", start: "09:00", end: "12:00", type: "Mensal" },
];

/** Respostas de ajuste e aprovação, para os comentários das demandas. */
export const ADJUSTMENT_REQUESTS = [
  "Pode ajustar o tamanho do logo? Está pequeno no mobile.",
  "O cliente pediu uma cor mais próxima do manual da marca.",
  "Trocar a chamada principal: o cliente prefere o texto da última campanha.",
  "O texto está cortando na margem direita, revisar o enquadramento.",
  "Ajustar o ritmo dos primeiros segundos: o gancho está lento.",
  "Incluir o telefone de contato no rodapé da peça.",
  "Trocar a foto de capa por uma com mais luz.",
];

export const ADJUSTMENT_RESPONSES = [
  "Ajuste feito, enviei a nova versão para revisão.",
  "Corrigido conforme o manual da marca. Pode conferir.",
  "Texto atualizado e peça reexportada.",
  "Nova versão no link do material, já com o enquadramento corrigido.",
];

export const PAUSE_REASONS = [
  "Aguardando material do cliente",
  "Aguardando resposta do social sobre o briefing",
  "Reunião interna",
  "Dúvida sobre a identidade visual",
];
