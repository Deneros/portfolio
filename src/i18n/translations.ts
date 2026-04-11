export const languages = {
  es: 'Español',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'es';

export const ui = {
  es: {
    // Nav
    'nav.home': 'Inicio',
    'nav.projects': 'Proyectos',
    'nav.blog': 'Blog',
    'nav.contact': 'Contacto',

    // Hero
    'hero.greeting': 'Hola, soy',
    'hero.description': 'Construyo sistemas escalables con enfoque en',
    'hero.backend': 'Backend',
    'hero.devops': 'DevOps',
    'hero.microservices': 'Arquitectura de Microservicios',
    'hero.experience': '+4 años de experiencia con Spring Boot, Django, Laravel, Docker, Kubernetes y automatización de infraestructura.',
    'hero.cta': 'Ver proyectos',
    'hero.contact': 'Contacto',

    // Stats
    'stats.projects': 'Proyectos',
    'stats.years': 'Años exp.',
    'stats.companies': 'Empresas',

    // Stack
    'stack.label': '// stack',
    'stack.title': 'Stack Técnico',
    'stack.subtitle': 'Tecnologías que uso en el día a día',
    'stack.backend': 'Backend',
    'stack.frontend': 'Frontend',
    'stack.ai': 'AI & Data',
    'stack.databases': 'Bases de datos',
    'stack.devops': 'DevOps & Cloud',
    'stack.architecture': 'Arquitectura',

    // Featured projects
    'featured.label': '// work',
    'featured.title': 'Proyectos Destacados',
    'featured.subtitle': 'Selección de mi trabajo más relevante',
    'featured.viewAll': 'Ver todos',
    'featured.viewAllMobile': 'Ver todos los proyectos',

    // CTA
    'cta.label': '// contact',
    'cta.title': '¿Tienes un proyecto en mente?',
    'cta.subtitle': 'Estoy abierto a colaboraciones, freelance y oportunidades full-time.',
    'cta.button': 'Hablemos',

    // Projects page
    'projects.title': 'Proyectos',
    'projects.description': 'Proyectos de software — Full-Stack, AI, DevOps, Mobile',
    'projects.subtitle': 'Desde MVPs con AI hasta sistemas enterprise en producción',
    'projects.filterAll': 'Todos',

    // Project detail
    'project.back': 'Volver a proyectos',
    'project.liveDemo': 'Live Demo',
    'project.scrollHint': 'Deslizar para ver más',

    // Blog
    'blog.title': 'Blog',
    'blog.description': 'Artículos sobre AI, arquitectura de software, DevOps y patrones de diseño',
    'blog.subtitle': 'Escribo sobre lo que aprendo construyendo software — AI, arquitectura, DevOps y patrones.',
    'blog.empty': 'Próximamente',
    'blog.emptySubtitle': 'Estoy preparando los primeros artículos. Vuelve pronto.',
    'blog.readTime': 'de lectura',
    'blog.back': 'Volver al blog',

    // Contact
    'contact.title': 'Contacto',
    'contact.description': 'Ponte en contacto conmigo para colaboraciones y oportunidades',
    'contact.subtitle': '¿Tienes un proyecto o propuesta? Escríbeme.',
    'contact.name': 'Nombre',
    'contact.namePlaceholder': 'Tu nombre',
    'contact.email': 'Email',
    'contact.emailPlaceholder': 'tu@email.com',
    'contact.message': 'Mensaje',
    'contact.messagePlaceholder': 'Cuéntame sobre tu proyecto...',
    'contact.send': 'Enviar mensaje',

    // Footer
    'footer.tagline': 'Backend Developer · DevOps & Microservices',
  },
  en: {
    // Nav
    'nav.home': 'Home',
    'nav.projects': 'Projects',
    'nav.blog': 'Blog',
    'nav.contact': 'Contact',

    // Hero
    'hero.greeting': "Hi, I'm",
    'hero.description': 'I build scalable systems focused on',
    'hero.backend': 'Backend',
    'hero.devops': 'DevOps',
    'hero.microservices': 'Microservices Architecture',
    'hero.experience': '+4 years of experience with Spring Boot, Django, Laravel, Docker, Kubernetes and infrastructure automation.',
    'hero.cta': 'View projects',
    'hero.contact': 'Contact',

    // Stats
    'stats.projects': 'Projects',
    'stats.years': 'Years exp.',
    'stats.companies': 'Companies',

    // Stack
    'stack.label': '// stack',
    'stack.title': 'Tech Stack',
    'stack.subtitle': 'Technologies I use daily',
    'stack.backend': 'Backend',
    'stack.frontend': 'Frontend',
    'stack.ai': 'AI & Data',
    'stack.databases': 'Databases',
    'stack.devops': 'DevOps & Cloud',
    'stack.architecture': 'Architecture',

    // Featured projects
    'featured.label': '// work',
    'featured.title': 'Featured Projects',
    'featured.subtitle': 'A selection of my most relevant work',
    'featured.viewAll': 'View all',
    'featured.viewAllMobile': 'View all projects',

    // CTA
    'cta.label': '// contact',
    'cta.title': 'Have a project in mind?',
    'cta.subtitle': "I'm open to collaborations, freelance and full-time opportunities.",
    'cta.button': "Let's talk",

    // Projects page
    'projects.title': 'Projects',
    'projects.description': 'Software projects — Full-Stack, AI, DevOps, Mobile',
    'projects.subtitle': 'From AI-powered MVPs to enterprise systems in production',
    'projects.filterAll': 'All',

    // Project detail
    'project.back': 'Back to projects',
    'project.liveDemo': 'Live Demo',
    'project.scrollHint': 'Scroll to see more',

    // Blog
    'blog.title': 'Blog',
    'blog.description': 'Articles about AI, software architecture, DevOps and design patterns',
    'blog.subtitle': 'I write about what I learn building software — AI, architecture, DevOps and patterns.',
    'blog.empty': 'Coming soon',
    'blog.emptySubtitle': "I'm preparing the first articles. Come back soon.",
    'blog.readTime': 'read',
    'blog.back': 'Back to blog',

    // Contact
    'contact.title': 'Contact',
    'contact.description': 'Get in touch for collaborations and opportunities',
    'contact.subtitle': 'Have a project or proposal? Write me.',
    'contact.name': 'Name',
    'contact.namePlaceholder': 'Your name',
    'contact.email': 'Email',
    'contact.emailPlaceholder': 'you@email.com',
    'contact.message': 'Message',
    'contact.messagePlaceholder': 'Tell me about your project...',
    'contact.send': 'Send message',

    // Footer
    'footer.tagline': 'Backend Developer · DevOps & Microservices',
  },
} as const;
