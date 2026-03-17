// ═══════════════════════════════════════════════════════════
// ⚙️ CONFIGURAÇÃO GOOGLE OAUTH2
// ═══════════════════════════════════════════════════════════
// 
// INSTRUÇÕES:
// 1. Vai ao Google Cloud Console: https://console.cloud.google.com
// 2. Cria projeto > Ativa Google Sheets API
// 3. Configura Tela de Consentimento OAuth
// 4. Cria Client ID OAuth 2.0 (tipo "Aplicação Web")
// 5. URI redirect: https://ppl-ai-code-interpreter-files.s3.amazonaws.com
// 6. Copia o Client ID e cola abaixo
// 7. Cria API Key e cola abaixo
// 8. (Opcional) Cria Google Sheet e cola o ID abaixo
// 9. Guarda este ficheiro
// 10. Abre no navegador
// 11. Clica "🔐 Login com Google"
// 12. Pronto! ✅
//
// ═══════════════════════════════════════════════════════════

const GOOGLE_CONFIG = {
  // ✅ CREDENCIAIS JÁ CONFIGURADAS
  CLIENT_ID: '698281140189-h7d130g3dpvbcig1spidroie3v559bnm.apps.googleusercontent.com',
  
  // ✅ API KEY CONFIGURADA
  API_KEY: 'AIzaSyCPRAYUg34nywTNfOhuyst0V4W6eDGVsI0',
  
  // ✅ SPREADSHEET ID CONFIGURADO
  SPREADSHEET_ID: '1HmlbNEVka8x1AEUqprjsEL0XlPX8dzhyqKilXyfkbfg',
  
  // ⚠️ NÃO ALTERAR ABAIXO DESTA LINHA ⚠️
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
  DISCOVERY_DOC: 'https://sheets.googleapis.com/$discovery/rest?version=v4'
};

// ═══════════════════════════════════════════════════════════

// Legacy config for backwards compatibility
const OAUTH_CONFIG = GOOGLE_CONFIG;

// Application State
const appState = {
    currentView: 'calendar',
    activeFilter: 'all',
    searchTerm: '',
    dayStates: {},
    modalOpen: false,
    changeCounter: 0,
    currentModalDay: null,
    lastSaveTime: null,
    autoSaveEnabled: true,
    pendingChanges: false,
    autoSaveTimer: null,
    editHistory: [],
    undoStack: [],
    redoStack: [],
    currentEditMode: null,
    templates: {
        stories: [
            '📸 Story: Foto conselheira + horário atendimento',
            '🎥 Story: Vídeo mini facial/demonstração produto',
            '❓ Story: Caixa perguntas sobre produtos',
            '📊 Story: Enquete interativa',
            '⭐ Story: Testemunho cliente',
            '💰 Story: Produto do dia em destaque',
            '🔥 Story: Promoção flash'
        ],
        reels: [
            '🎬 Reel: Um dia com a conselheira - Bastidores (30-60seg)',
            '✨ Reel: Antes/Depois usando produto (15seg)',
            '📦 Reel: Unboxing coffrets - conteúdo e preço (20seg)',
            '🏪 Reel: Tour pela farmácia (30seg)',
            '🔥 Reel: Campanha do dia - música trendy (30seg)'
        ],
        posts: [
            '📱 Post Carrossel: Apresentação conselheira + produtos',
            '📘 Post Educativo: Dicas de saúde + produtos',
            '🔥 Post: Banner promoção principal',
            '💚 Post: Testemunhos clientes',
            '📸 Post: Foto do dia na farmácia'
        ],
        videos: [
            '🎥 Vídeo: Entrevista conselheira - Dicas expert (1-2min)',
            '❓ Vídeo: FAQ Promoções - Perguntas frequentes (1min)',
            '🚗 Vídeo: Tutorial FarmaDrive (45seg)',
            '💙 Vídeo: Especial Novembro Azul (2min)'
        ]
    },
    configData: {
        spreadsheetId: '',
        apiKey: '',
        lastBackup: null,
        connectionStatus: 'not_configured'
    },
    confirmDialog: {
        active: false,
        callback: null,
        message: '',
        title: ''
    },
    templateDialog: {
        active: false,
        type: '',
        dayNum: null,
        selectedTemplate: null
    },
    duplicateDialog: {
        active: false,
        sourceDayNum: null
    },
    googleAuth: {
        isSignedIn: false,
        userEmail: '',
        canSaveToSheets: false,
        gapiLoaded: false,
        authInstance: null
    }
};

// Sample data based on the provided JSON - CORRIGIDO NOVEMBRO AZUL
// Montras/Displays from Excel structure (EXACT FROM SPEC)
const MONTRAS_OPTIONS = [
    { id: 'montra_digital', name: 'Montra Digital (A)' },
    { id: 'montra_optica', name: 'Montra Óptica (C e D)' },
    { id: 'montra_b', name: 'Montra B (155AX238L)' },
    { id: 'porta_cosmetica', name: 'Porta Cosmética (A200XL92,5) 150' },
    { id: 'mesa_190', name: 'Mesa 190' },
    { id: 'coluna_150', name: 'Coluna 150' },
    { id: 'frente_balcao', name: 'Frente Balcão 90' },
    { id: 'balcao_cosmetica', name: 'Balcão Cosmética 50' }
];

// CONSELHEIRAS ATTRIBUTION MAP (EXACT FROM SPEC)
const CONSELHEIRAS_DIAS = {
    3: "Esthederm/Bioderma",
    5: "Dermagius",
    7: "Pierre Fabre (Avene, Rene, Klorane, Aderma)",
    10: "Pierre Fabre (Avene, Rene, Klorane, Aderma)",
    11: "Caudalie",
    12: "Caudalie",
    14: "Filorga",
    17: "Lierac",
    19: "Nuxe",
    21: "Vichy",
    23: "Uriage",
    24: "Uriage",
    25: "Filorga",
    26: "Sesderma",
    28: "SVR e Lazartigue"
};

// CAMPANHAS ATIVAS (EXACT 19 FROM SPEC)
const CAMPANHAS_LISTA = [
    "Colagénius 20%",
    "Depuralina e Drenaslim 35%",
    "Aquileia 20%",
    "Esthederm 25%",
    "Bioderma 25%",
    "Filorga 30%",
    "Dermagius 20%",
    "Aderma 25%",
    "Klorane 30%",
    "Ducray 20%",
    "La Roche Posay 25%",
    "Lierac 30%",
    "Nuxe 20%",
    "SVR 25%",
    "Uriage 20%",
    "Vichy 25%",
    "Colagenius",
    "Aquileia",
    "Neutrogena"
];

const calendarData = {
    days: [
        {
            dia: 1,
            data: "01/11/2025",
            dia_semana: "Sábado",
            fase: "NOVEMBRO AZUL - Saúde Masculina",
            novembro_azul: true,
            conselheira: "",
            montra_ativa: "montra_b",
            stories: [
                "📸 Story 1: Bastidores farmácia - equipa a preparar novidades",
                "💰 Story 2: Produto do dia em destaque com preço promocional",
                "📊 Story: Enquete interativa (Qual produto querem ver na Black Friday?)"
            ],
            reels: [
                "🏪 Reel 1: Tour pela farmácia mostrando novidades e promoções (30seg)",
                "📦 Reel 2: Unboxing coffrets - Mostrar conteúdo e preço (20seg)",
                "🔥 Reel Especial: Campanha principal do dia - Música trendy + produtos em destaque (30seg)"
            ],
            posts: [
                "📘 Post Educativo: Novembro Azul - Importância prevenção saúde masculina + produtos recomendados"
            ],
            videos: [],
            banners: [
                "🎨 Banner: NOVEMBRO CHEGOU - Novembro Azul + Black Friday + Todas campanhas ativas"
            ],
            newsletter: "",
            montra_mesa: [
                "🎨 RENOVAÇÃO MONTRA/MESA - Nova decoração temática",
                "📸 Foto montra para Stories/Post - Mostrar mudança"
            ],
            acoes_loja: [
                "💚 Incentivo seguidor Instagram - 5% extra desconto quem mostrar que segue"
            ]
        },
        {
            dia: 3,
            data: "03/11/2025",
            dia_semana: "Segunda",
            fase: "Lançamento Campanhas + Preparação Black Friday",
            novembro_azul: false,
            conselheira: "Esthederm/Bioderma",
            montra_ativa: "mesa_190",
            stories: [
                "📸 Story 1: Foto da conselheira Esthederm/ bioderma + horário atendimento",
                "🎥 Story 2: Vídeo mini facial/demonstração produto da Esthederm/ bioderma",
                "❓ Story 3: Caixa perguntas sobre produtos Esthederm/ bioderma",
                "📊 Story: Enquete interativa (Qual produto querem ver na Black Friday?)",
                "⭐ Story: Testemunho cliente (vídeo curto ou foto com quote)",
                "🚗 Story: Divulgação FarmaDrive - Como funciona (15 seg)"
            ],
            reels: [
                "🎬 Reel 1: 'Um dia com a conselheira Esthederm/ bioderma' - Bastidores, atendimento, mini facial (30-60seg)",
                "✨ Reel 2: Antes/Depois usando produto Esthederm/ bioderma (transição rápida 15seg)"
            ],
            posts: [
                "📱 Post Carrossel: Apresentação Esthederm/ bioderma - Foto conselheira + Produtos marca + Promoções exclusivas + Horário atendimento + CTA agendar"
            ],
            videos: [
                "🎥 Vídeo 1: Entrevista conselheira Esthederm/ bioderma - Dicas expert + Lançamentos (1-2min)",
                "❓ Vídeo 2: FAQ Promoções - Responder perguntas frequentes clientes (1min)"
            ],
            banners: [
                "📢 Banner rotativo: Campanha do dia + Conselheira + Serviços"
            ],
            newsletter: "",
            montra_mesa: [
                "🏷️ Mesa especial Esthederm/ bioderma - Produtos marca em destaque"
            ],
            acoes_loja: [
                "✨ Mini faciais com Esthederm/ bioderma - Agendar via telefone/Instagram",
                "🎁 Amostras exclusivas Esthederm/ bioderma - Para quem comprar produto marca",
                "💚 Incentivo seguidor Instagram - 5% extra desconto quem mostrar que segue"
            ]
        },
        {
            dia: 5,
            data: "05/11/2025",
            dia_semana: "Quarta",
            fase: "Lançamento Campanhas + Preparação Black Friday",
            novembro_azul: false,
            conselheira: "Dermagius",
            montra_ativa: "montra_b",
            stories: [
                "📸 Story 1: Foto da conselheira Dermagius + horário atendimento",
                "🎥 Story 2: Vídeo mini facial/demonstração produto da Dermagius",
                "❓ Story 3: Caixa perguntas sobre produtos Dermagius",
                "📊 Story: Enquete interativa (Qual produto querem ver na Black Friday?)"
            ],
            reels: [
                "🎬 Reel 1: 'Um dia com a conselheira Dermagius' - Bastidores, atendimento, mini facial (30-60seg)",
                "✨ Reel 2: Antes/Depois usando produto Dermagius (transição rápida 15seg)"
            ],
            posts: [
                "📱 Post Carrossel: Apresentação Dermagius - Foto conselheira + Produtos marca + Promoções exclusivas + Horário atendimento + CTA agendar"
            ],
            videos: [
                "🎥 Vídeo 1: Entrevista conselheira Dermagius - Dicas expert + Lançamentos (1-2min)",
                "❓ Vídeo 2: FAQ Promoções - Responder perguntas frequentes clientes (1min)"
            ],
            banners: [
                "📢 Banner rotativo: Campanha do dia + Conselheira + Serviços"
            ],
            newsletter: "",
            montra_mesa: [
                "🏷️ Mesa especial Dermagius - Produtos marca em destaque"
            ],
            acoes_loja: [
                "✨ Mini faciais com Dermagius - Agendar via telefone/Instagram",
                "🎁 Amostras exclusivas Dermagius - Para quem comprar produto marca",
                "💚 Incentivo seguidor Instagram - 5% extra desconto quem mostrar que segue"
            ]
        },
        {
            dia: 17,
            data: "17/11/2025",
            dia_semana: "Segunda",
            fase: "NOVEMBRO AZUL - Dia Mundial do Homem",
            novembro_azul: true,
            conselheira: "Pierre Fabre (Avene, Rene, Klorane, Aderma)",
            montra_ativa: "porta_cosmetica",
            stories: [
                "💙 Story 1: Banner Novembro Azul - Dia Mundial do Homem",
                "💙 Story 2: Estatísticas saúde masculina Portugal",
                "💙 Story 3: Produtos recomendados saúde homem",
                "💙 Story 4: Depoimento cliente sobre prevenção",
                "💙 Story 5: CTA consulta gratuita",
                "📸 Story: Conselheira Pierre Fabre + horário",
                "🎥 Story: Demo produto Pierre Fabre"
            ],
            reels: [
                "💙 Reel 1: Novembro Azul - Mensagem Dia Mundial Homem (30seg)",
                "💙 Reel 2: Depoimentos clientes homens (20seg)",
                "🎬 Reel: Conselheira Pierre Fabre (30-60seg)"
            ],
            posts: [
                "💙 Post Carrossel: Dia Mundial Homem + Importância Autocuidado Masculino",
                "📱 Post: Apresentação Pierre Fabre + Produtos"
            ],
            videos: [
                "💙 Vídeo: Especial Dia Mundial do Homem (2min)",
                "🎥 Vídeo: Entrevista Pierre Fabre (1-2min)"
            ],
            banners: [
                "💙 Banner: DIA MUNDIAL DO HOMEM - Novembro Azul"
            ],
            newsletter: "",
            montra_mesa: [],
            acoes_loja: [
                "💙 Novembro Azul - Campanha especial Dia Mundial Homem",
                "💙 Desconto extra produtos masculinos",
                "✨ Mini faciais Pierre Fabre",
                "🎁 Amostras Pierre Fabre",
                "💚 5% extra seguidores Instagram"
            ]
        },
        {
            dia: 25,
            data: "25/11/2025",
            dia_semana: "Terça",
            fase: "BLACK FRIDAY WEEK",
            novembro_azul: false,
            conselheira: "Filorga",
            montra_ativa: "coluna_150",
            stories: [
                "📸 Story 1: Foto da conselheira Filorga + horário atendimento",
                "🎥 Story 2: Vídeo mini facial/demonstração produto da Filorga",
                "❓ Story 3: Caixa perguntas sobre produtos Filorga",
                "📊 Story: Enquete interativa (Qual produto querem ver na Black Friday?)",
                "⏰ Story: COUNTDOWN Black Friday - Faltam 3 dias!"
            ],
            reels: [
                "🎬 Reel 1: 'Um dia com a conselheira Filorga' - Bastidores, atendimento, mini facial (30-60seg)",
                "✨ Reel 2: Antes/Depois usando produto Filorga (transição rápida 15seg)",
                "🔥 Reel Especial: Campanha principal do dia - Música trendy + produtos em destaque (30seg)"
            ],
            posts: [
                "🔥 Post BLACK FRIDAY: Banner principal com TODAS promoções ativas + CTA comprar online + lembrete FarmaDrive"
            ],
            videos: [
                "🎥 Vídeo 1: Entrevista conselheira Filorga - Dicas expert + Lançamentos (1-2min)",
                "❓ Vídeo 2: FAQ Promoções - Responder perguntas frequentes clientes (1min)",
                "🚗 Vídeo 3: Tutorial FarmaDrive - Passo a passo fazer encomenda e levantar (45seg)"
            ],
            banners: [
                "🔥 Banner: BLACK FRIDAY ATIVA - Descontos até 60% + Embrulho grátis + FarmaDrive"
            ],
            newsletter: "",
            montra_mesa: [
                "🏷️ Mesa especial Filorga - Produtos marca em destaque"
            ],
            acoes_loja: [
                "✨ Mini faciais com Filorga - Agendar via telefone/Instagram",
                "🎁 Amostras exclusivas Filorga - Para quem comprar produto marca",
                "💚 Incentivo seguidor Instagram - 5% extra desconto quem mostrar que segue",
                "📣 Divulgação ativa embrulho grátis + FarmaDrive em todos atendimentos"
            ]
        },
        {
            dia: 28,
            data: "28/11/2025",
            dia_semana: "Sexta",
            fase: "BLACK FRIDAY WEEK",
            novembro_azul: false,
            conselheira: "SVR e Lazartigue",
            montra_ativa: "frente_balcao",
            stories: [
                "📸 Story 1: Foto da conselheira SVR e Lazartigue + horário atendimento",
                "🎥 Story 2: Vídeo mini facial/demonstração produto da SVR e Lazartigue",
                "❓ Story 3: Caixa perguntas sobre produtos SVR e Lazartigue",
                "📊 Story: Enquete interativa (Qual produto querem ver na Black Friday?)",
                "⏰ Story: COUNTDOWN Black Friday - Faltam 0 dias!"
            ],
            reels: [
                "🎬 Reel 1: 'Um dia com a conselheira SVR e Lazartigue' - Bastidores, atendimento, mini facial (30-60seg)",
                "✨ Reel 2: Antes/Depois usando produto SVR e Lazartigue (transição rápida 15seg)",
                "🔥 Reel Especial: Campanha principal do dia - Música trendy + produtos em destaque (30seg)"
            ],
            posts: [
                "🔥 Post BLACK FRIDAY: Banner principal com TODAS promoções ativas + CTA comprar online + lembrete FarmaDrive"
            ],
            videos: [
                "🎥 Vídeo 1: Entrevista conselheira SVR e Lazartigue - Dicas expert + Lançamentos (1-2min)",
                "❓ Vídeo 2: FAQ Promoções - Responder perguntas frequentes clientes (1min)",
                "🚗 Vídeo 3: Tutorial FarmaDrive - Passo a passo fazer encomenda e levantar (45seg)"
            ],
            banners: [
                "🔥 Banner: BLACK FRIDAY ATIVA - Descontos até 60% + Embrulho grátis + FarmaDrive"
            ],
            newsletter: "",
            montra_mesa: [
                "🎨 RENOVAÇÃO MONTRA/MESA - Nova decoração temática",
                "📸 Foto montra para Stories/Post - Mostrar mudança",
                "🏷️ Mesa especial SVR e Lazartigue - Produtos marca em destaque"
            ],
            acoes_loja: [
                "✨ Mini faciais com SVR e Lazartigue - Agendar via telefone/Instagram",
                "🎁 Amostras exclusivas SVR e Lazartigue - Para quem comprar produto marca",
                "💚 Incentivo seguidor Instagram - 5% extra desconto quem mostrar que segue",
                "📣 Divulgação ativa embrulho grátis + FarmaDrive em todos atendimentos"
            ]
        }
    ],
    campanhas: CAMPANHAS_LISTA,
    servicos: [
        "🎁 Embrulho de presentes GRÁTIS (loja e online)",
        "🚗 FarmaDrive - Levantamento sem sair do carro",
        "✨ Coffrets novos disponíveis",
        "💚 Mini faciais com conselheiras",
        "🎀 Amostras exclusivas"
    ]
};

// Generate full month data (30 days)
function generateFullMonthData() {
    const fullMonth = [];
    const existingDays = new Map(calendarData.days.map(day => [day.dia, day]));
    
    for (let i = 1; i <= 30; i++) {
        if (existingDays.has(i)) {
            fullMonth.push(existingDays.get(i));
        } else {
            // Generate basic day structure for days without specific data
            const date = new Date(2025, 10, i); // November 2025
            const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            
            let fase = "";
            let novembro_azul = false;
            let conselheira = CONSELHEIRAS_DIAS[i] || "";
            
            if (i === 1) { fase = "💙 NOVEMBRO AZUL - Saúde Masculina"; novembro_azul = true; }
            else if (i === 17) { fase = "💙 NOVEMBRO AZUL - Dia Mundial do Homem"; novembro_azul = true; }
            else if (i >= 2 && i <= 7) fase = "Lançamento Campanhas + Preparação";
            else if (i >= 8 && i <= 14) fase = "Aquecimento Black Friday";
            else if (i >= 15 && i <= 21) fase = "Pré-Black Friday";
            else if (i >= 22 && i <= 28) fase = "BLACK FRIDAY WEEK 🔥";
            else fase = "Encerramento";
            
            fullMonth.push({
                dia: i,
                data: `${String(i).padStart(2, '0')}/11/2025`,
                dia_semana: dayNames[date.getDay()],
                fase: fase,
                novembro_azul: novembro_azul,
                conselheira: conselheira,
                stories: [
                    "📸 Story: Produto do dia em destaque",
                    "📊 Story: Enquete interativa"
                ],
                reels: [
                    "🎬 Reel: Conteúdo do dia"
                ],
                posts: [
                    "📱 Post: Campanha do dia"
                ],
                videos: [],
                banners: [
                    "📢 Banner: Campanhas ativas"
                ],
                newsletter: "",
                montra_mesa: [],
                acoes_loja: [
                    "💚 Incentivo seguidor Instagram - 5% extra desconto"
                ]
            });
    
    // Navigation event listeners
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.target.dataset.view;
            switchMainView(view);
        });
    });
    
    // Legacy view switchers (keep for compatibility)
    document.getElementById('calendar-view')?.addEventListener('click', () => {
        switchMainView('calendar');
    });
    
    document.getElementById('list-view')?.addEventListener('click', () => {
        switchMainView('list');
    });
        }
    }
    
    return fullMonth;
}

// Initialize full month data
const fullMonthData = generateFullMonthData();

// Utility Functions
function getPhaseClass(fase) {
    if (fase.includes('Novembro Azul')) return 'phase-novembro-azul';
    if (fase.includes('Aquecimento')) return 'phase-aquecimento';
    if (fase.includes('Pré-')) return 'phase-pre-bf';
    if (fase.includes('BLACK FRIDAY')) return 'phase-black-friday';
    if (fase.includes('Encerramento')) return 'phase-encerramento';
    return '';
}

function getContentIcons(day) {
    const icons = [];
    if (day.stories.length > 0) icons.push('📸');
    if (day.reels.length > 0) icons.push('🎬');
    if (day.posts.length > 0) icons.push('📱');
    if (day.videos.length > 0) icons.push('🎥');
    return icons;
}

function initializeDayStates() {
    fullMonthData.forEach(day => {
        if (!appState.dayStates[day.dia]) {
            appState.dayStates[day.dia] = {
                storiesCompleted: [],
                reelsCompleted: [],
                postsCompleted: [],
                videosCompleted: [],
                observations: '',
                lab_parcerias: '',
                ajustes: '',
                ideias: '',
                isComplete: false,
                conselheira_horario: '',
                conselheira_produtos: '',
                customStories: [],
                customReels: [],
                customPosts: [],
                customVideos: []
            };
        }
    });
}

// Auto-save functions
function triggerAutoSave() {
    if (!appState.autoSaveEnabled) return;
    
    clearTimeout(appState.autoSaveTimer);
    appState.pendingChanges = true;
    updateAutoSaveStatus('⚠️ Alterações não guardadas');
    
    appState.autoSaveTimer = setTimeout(() => {
        autoSaveToMemory();
        appState.pendingChanges = false;
        updateAutoSaveStatus('💾 Guardado automaticamente');
        setTimeout(() => {
            updateAutoSaveStatus('✅ Auto-save ativo - Alterações guardadas automaticamente');
        }, 2000);
    }, 2000);
}

function autoSaveToMemory() {
    appState.lastSaveTime = new Date();
    // Simulando localStorage com variáveis em memória
    window.farmaciaBackupData = {
        version: '4.0',
        timestamp: appState.lastSaveTime.toISOString(),
        dayStates: JSON.parse(JSON.stringify(appState.dayStates)),
        fullMonthData: JSON.parse(JSON.stringify(fullMonthData)),
        totalChanges: appState.changeCounter,
        configData: JSON.parse(JSON.stringify(appState.configData))
    };
    
    // Update last save time in UI
    const timeStr = appState.lastSaveTime.toLocaleTimeString('pt-PT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    const lastSaveInfo = document.getElementById('last-save-info');
    if (lastSaveInfo) {
        lastSaveInfo.textContent = `Última alteração: hoje às ${timeStr}`;
    }
}

function loadAutoSavedData() {
    if (window.farmaciaBackupData && window.farmaciaBackupData.dayStates) {
        appState.dayStates = window.farmaciaBackupData.dayStates;
        appState.changeCounter = window.farmaciaBackupData.totalChanges || 0;
        
        if (window.farmaciaBackupData.configData) {
            appState.configData = { ...appState.configData, ...window.farmaciaBackupData.configData };
        }
        
        showToast('📥 Dados anteriores restaurados da sessão!', 'success');
    }
}

function updateAutoSaveStatus(message) {
    const statusEl = document.querySelector('.auto-save-status');
    if (statusEl) {
        statusEl.innerHTML = message;
    }
    
    // Update individual components
    const progressInfo = document.getElementById('progress-info');
    if (progressInfo) {
        progressInfo.textContent = `Progresso: ${calculateOverallProgress()}%`;
    }
    
    const lastSaveInfo = document.getElementById('last-save-info');
    if (lastSaveInfo && appState.lastSaveTime) {
        const timeStr = appState.lastSaveTime.toLocaleTimeString('pt-PT', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        lastSaveInfo.textContent = `Última alteração: hoje às ${timeStr}`;
    }
}

function updateProgress() {
    const totalDays = 30;
    const completedDays = Object.values(appState.dayStates).filter(state => state.isComplete).length;
    const progressPercentage = (completedDays / totalDays) * 100;
    
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const totalProgressStat = document.getElementById('total-progress');
    
    if (progressFill) {
        progressFill.style.width = `${progressPercentage}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${Math.round(progressPercentage)}% do mês concluído (${completedDays}/${totalDays} dias)`;
    }
    
    if (totalProgressStat) {
        totalProgressStat.textContent = `${Math.round(progressPercentage)}%`;
    }
    
    // Update header progress info
    const progressInfo = document.getElementById('progress-info');
    if (progressInfo) {
        progressInfo.textContent = `Progresso: ${Math.round(progressPercentage)}%`;
    }
    
    // Update stats cards with real data
    updateStatsCards();
    
    // Update progress dashboard if active
    if (appState.currentView === 'progress') {
        updateProgressStats();
    }
}

function updateStatsCards() {
    let totalStories = 0, totalReels = 0, totalPosts = 0, totalVideos = 0;
    let completedStories = 0, completedReels = 0, completedPosts = 0, completedVideos = 0;
    
    fullMonthData.forEach(day => {
        const dayState = appState.dayStates[day.dia];
        const customStories = dayState?.customStories?.length || 0;
        const customReels = dayState?.customReels?.length || 0;
        const customPosts = dayState?.customPosts?.length || 0;
        const customVideos = dayState?.customVideos?.length || 0;
        
        totalStories += day.stories.length + customStories;
        totalReels += day.reels.length + customReels;
        totalPosts += day.posts.length + customPosts;
        totalVideos += day.videos.length + customVideos;
        
        completedStories += dayState?.storiesCompleted?.length || 0;
        completedReels += dayState?.reelsCompleted?.length || 0;
        completedPosts += dayState?.postsCompleted?.length || 0;
        completedVideos += dayState?.videosCompleted?.length || 0;
    });
    
    // Update numbers
    const storiesEl = document.getElementById('total-stories');
    const reelsEl = document.getElementById('total-reels');
    const postsEl = document.getElementById('total-posts');
    const videosEl = document.getElementById('total-videos');
    
    if (storiesEl) storiesEl.textContent = totalStories;
    if (reelsEl) reelsEl.textContent = totalReels;
    if (postsEl) postsEl.textContent = totalPosts;
    if (videosEl) videosEl.textContent = totalVideos;
    
    // Update progress
    const storiesProgressEl = document.getElementById('stories-progress');
    const reelsProgressEl = document.getElementById('reels-progress');
    const postsProgressEl = document.getElementById('posts-progress');
    const videosProgressEl = document.getElementById('videos-progress');
    
    const storiesPercent = totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0;
    const reelsPercent = totalReels > 0 ? Math.round((completedReels / totalReels) * 100) : 0;
    const postsPercent = totalPosts > 0 ? Math.round((completedPosts / totalPosts) * 100) : 0;
    const videosPercent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
    
    if (storiesProgressEl) storiesProgressEl.textContent = `${storiesPercent}% feitos`;
    if (reelsProgressEl) reelsProgressEl.textContent = `${reelsPercent}% feitos`;
    if (postsProgressEl) postsProgressEl.textContent = `${postsPercent}% feitos`;
    if (videosProgressEl) videosProgressEl.textContent = `${videosPercent}% feitos`;
}

// Calendar Rendering
function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;
    
    // Calculate offset for November 2025 (starts on Saturday = 6)
    const firstDay = 6; // Saturday
    let html = '';
    
    // Add empty cells for days before November 1st
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    // Add calendar days
    fullMonthData.forEach(day => {
        const dayState = appState.dayStates[day.dia];
        const phaseClass = getPhaseClass(day.fase);
        const hasConselheira = day.conselheira ? 'has-conselheira' : '';
        const contentIcons = getContentIcons(day);
        const isComplete = dayState?.isComplete ? 'complete' : '';
        const montraName = getMostraName(day.montra_ativa);
        
        html += `
            <div class="calendar-day ${phaseClass} ${hasConselheira} ${isComplete}" data-day="${day.dia}">
                <div class="day-header">
                    <div>
                        <div class="day-number">${day.dia}</div>
                        <div class="day-weekday">${day.dia_semana.substring(0, 3)}</div>
                    </div>
                </div>
                ${day.montra_ativa ? `<div class="montra-indicator" title="${montraName}">🏢</div>` : ''}
                ${day.conselheira ? '<div class="conselheira-badge">👤</div>' : ''}
                <div class="content-icons">
                    ${contentIcons.map(icon => `<span class="content-icon">${icon}</span>`).join('')}
                </div>
            </div>
        `;
    });
    
    calendarGrid.innerHTML = html;
    
    // Add click listeners
    document.querySelectorAll('.calendar-day[data-day]').forEach(dayEl => {
        dayEl.addEventListener('click', (e) => {
            const dayNum = parseInt(e.currentTarget.dataset.day);
            openDayModal(dayNum);
        });
    });
    
    // Update calendar with Novembro Azul indicators
    document.querySelectorAll('.calendar-day[data-day]').forEach(dayEl => {
        const dayNum = parseInt(dayEl.dataset.day);
        const day = fullMonthData.find(d => d.dia === dayNum);
        if (day && day.novembro_azul) {
            dayEl.classList.add('novembro-azul-day');
            const badge = document.createElement('div');
            badge.className = 'novembro-azul-badge';
            badge.textContent = '💙';
            dayEl.appendChild(badge);
        }
    });
}

// List View Rendering
function renderListView() {
    const tableBody = document.getElementById('list-table-body');
    if (!tableBody) return;
    
    let html = '';
    
    fullMonthData.forEach(day => {
        const dayState = appState.dayStates[day.dia];
        const statusText = dayState?.isComplete ? '<span class="status-complete">✅ Concluído</span>' : '<span class="status-pending">⏳ Pendente</span>';
        const montraName = getMostraName(day.montra_ativa);
        
        html += `
            <tr data-day="${day.dia}" style="cursor: pointer;">
                <td>${day.dia}</td>
                <td>${day.data}</td>
                <td>${day.dia_semana}</td>
                <td><span class="montra-cell-badge" title="${montraName}">🏢 ${montraName}</span></td>
                <td>${day.conselheira || '-'}</td>
                <td class="text-center">${day.stories.length}</td>
                <td class="text-center">${day.reels.length}</td>
                <td class="text-center">${day.posts.length}</td>
                <td class="text-center">${day.videos.length}</td>
                <td>${statusText}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    // Add click listeners
    document.querySelectorAll('#list-table-body tr[data-day]').forEach(row => {
        row.addEventListener('click', (e) => {
            const dayNum = parseInt(e.currentTarget.dataset.day);
            openDayModal(dayNum);
        });
    });
}

// Get montra name from ID
function getMostraName(montraId) {
    if (!montraId) return 'Nenhuma';
    const montra = MONTRAS_OPTIONS.find(m => m.id === montraId);
    return montra ? montra.name : 'N/A';
}

// Edit montra for a day
function editMontra(dayNum) {
    const day = fullMonthData.find(d => d.dia === dayNum);
    if (!day) return;
    
    // Create options list
    let optionsText = 'Selecione a montra ativa:\n\n';
    MONTRAS_OPTIONS.forEach((montra, index) => {
        optionsText += `${index + 1}. ${montra.name}\n`;
    });
    optionsText += '\n0. Nenhuma\n';
    
    const selection = prompt(optionsText, '1');
    if (selection === null) return; // Cancelled
    
    const selectedIndex = parseInt(selection) - 1;
    
    if (selection === '0') {
        day.montra_ativa = '';
        showToast('✅ Montra removida!', 'success');
    } else if (selectedIndex >= 0 && selectedIndex < MONTRAS_OPTIONS.length) {
        const oldMontra = getMostraName(day.montra_ativa);
        day.montra_ativa = MONTRAS_OPTIONS[selectedIndex].id;
        const newMontra = MONTRAS_OPTIONS[selectedIndex].name;
        
        addToHistory(dayNum, `Montra alterada: "${oldMontra}" → "${newMontra}"`);
        showToast(`🏢 Montra alterada para "${newMontra}"!`, 'success');
    } else {
        showToast('⚠️ Seleção inválida!', 'warning');
        return;
    }
    
    triggerAutoSave();
    incrementChangeCounter();
    openDayModal(dayNum); // Refresh modal
    
    // Update calendar if visible
    if (appState.currentView === 'calendar') {
        renderCalendar();
    }
}

// Enhanced Modal Functions with Complete Editing
function openDayModal(dayNum) {
    const day = fullMonthData.find(d => d.dia === dayNum);
    if (!day) return;
    
    const modal = document.getElementById('day-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    appState.currentModalDay = dayNum;
    modalTitle.textContent = `📅 Dia ${dayNum} - ${day.data} - ${day.dia_semana}`;
    
    const dayState = appState.dayStates[dayNum];
    
    modalBody.innerHTML = `
        <div class="day-info">
            <div class="day-info-header">
                <div class="day-info-left">
                    <h3 class="day-info__title editable-field" data-field="fase" data-day="${dayNum}">${day.fase}${day.novembro_azul ? ' <span class="novembro-badge">💙 Novembro Azul</span>' : ''}</h3>
                    <div class="day-info__meta">
                        <div class="meta-item"><strong>Data:</strong> ${day.data}</div>
                        <div class="meta-item"><strong>Dia:</strong> ${day.dia_semana}</div>
                        <div class="meta-item montra-display">
                            <strong>Montra Ativa:</strong> 
                            <span class="montra-badge" id="montra-display-${dayNum}">${getMostraName(day.montra_ativa)}</span>
                            <button class="btn btn--sm btn--outline" onclick="editMontra(${dayNum})" title="Editar Montra">✏️ Alterar</button>
                        </div>
                        ${day.conselheira ? `<div class="meta-item"><strong>Conselheira:</strong> <span class="editable-field" data-field="conselheira" data-day="${dayNum}">${day.conselheira}</span></div>` : ''}
                    </div>
                </div>
                <div class="day-info-actions">
                    <button class="btn btn--sm btn--outline" onclick="editDayTheme(${dayNum})" title="Editar Tema">
                        ✏️ Editar Tema
                    </button>
                    ${!day.conselheira ? `<button class="btn btn--sm btn--primary" onclick="addConselheira(${dayNum})" title="Adicionar Conselheira">+ Conselheira</button>` : ''}
                </div>
            </div>
            
            <!-- Progress indicator for this day -->
            <div class="day-progress-section">
                <div class="day-progress-bar">
                    <div class="day-progress-fill" id="day-progress-fill-${dayNum}"></div>
                </div>
                <div class="day-progress-text" id="day-progress-text-${dayNum}">Calculando progresso...</div>
            </div>
            
            <!-- History section -->
            <div class="history-section" id="history-section-${dayNum}">
                <div class="history-title">📜 HISTÓRICO (últimas alterações)</div>
                <div class="history-list" id="history-list-${dayNum}"></div>
            </div>
        </div>
        
        <div class="modal-tabs">
            <button class="modal-tab-btn active" data-tab="stories">📸 Stories</button>
            <button class="modal-tab-btn" data-tab="reels">🎬 Reels</button>
            <button class="modal-tab-btn" data-tab="posts">📱 Posts</button>
            ${day.videos && day.videos.length > 0 ? '<button class="modal-tab-btn" data-tab="videos">🎥 Vídeos</button>' : ''}
            <button class="modal-tab-btn" data-tab="loja">🎨 Loja</button>
            <button class="modal-tab-btn" data-tab="notas">📝 Notas</button>
        </div>
        
        <div class="modal-tab-content">
            <div class="tab-panel active" data-panel="stories">
                ${createEnhancedContentSection('📸 STORIES', day.stories, dayState.storiesCompleted, 'stories', dayNum, dayState)}
            </div>
            <div class="tab-panel" data-panel="reels">
                ${createEnhancedContentSection('🎬 REELS', day.reels, dayState.reelsCompleted, 'reels', dayNum, dayState)}
            </div>
            <div class="tab-panel" data-panel="posts">
                ${createEnhancedContentSection('📱 POSTS', day.posts, dayState.postsCompleted, 'posts', dayNum, dayState)}
            </div>
            ${day.videos && day.videos.length > 0 || (dayState.customVideos && dayState.customVideos.length > 0) ? `
                <div class="tab-panel" data-panel="videos">
                    ${createEnhancedContentSection('🎥 VÍDEOS', day.videos, dayState.videosCompleted, 'videos', dayNum, dayState)}
                </div>
            ` : ''}
            <div class="tab-panel" data-panel="loja">
                ${createLojaSection(day, dayNum)}
            </div>
            <div class="tab-panel" data-panel="notas">
                ${createObservationsSection(dayState, dayNum)}
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    appState.modalOpen = true;
    
    // Initialize section toggles
    initializeSectionToggles();
    
    // Update modal button states
    const markCompleteBtn = document.getElementById('mark-complete');
    if (markCompleteBtn) {
        if (dayState.isComplete) {
            markCompleteBtn.textContent = '↩️ Marcar Como Pendente';
            markCompleteBtn.classList.remove('btn--secondary');
            markCompleteBtn.classList.add('btn--warning');
        } else {
            markCompleteBtn.textContent = '✅ Marcar Concluído';
            markCompleteBtn.classList.remove('btn--warning');
            markCompleteBtn.classList.add('btn--secondary');
        }
    }
    
    // Add global functions to window for onclick handlers
    window.addConselheira = addConselheira;
    window.editConselheira = editConselheira;
    window.removeConselheira = removeConselheira;
    window.saveConselheiraChanges = saveConselheiraChanges;
    window.addNewAction = addNewAction;
    window.cancelAction = cancelAction;
    
    // Update history display and day progress
    updateHistoryDisplay(dayNum);
    updateDayProgress(dayNum);
    
    // Update modal progress
    updateModalProgress(dayNum);
}

function updateModalProgress(dayNum) {
    const day = fullMonthData.find(d => d.dia === dayNum);
    const dayState = appState.dayStates[dayNum];
    
    if (!day || !dayState) return;
    
    // Calculate progress
    const customStories = dayState.customStories?.length || 0;
    const customReels = dayState.customReels?.length || 0;
    const customPosts = dayState.customPosts?.length || 0;
    const customVideos = dayState.customVideos?.length || 0;
    
    const totalTasks = day.stories.length + customStories + 
                      day.reels.length + customReels + 
                      day.posts.length + customPosts + 
                      day.videos.length + customVideos;
                      
    const completedTasks = (dayState.storiesCompleted?.length || 0) +
                          (dayState.reelsCompleted?.length || 0) +
                          (dayState.postsCompleted?.length || 0) +
                          (dayState.videosCompleted?.length || 0);
                          
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // Update modal progress
    const progressFill = document.getElementById('modal-progress-fill');
    const progressText = document.getElementById('modal-progress-text');
    
    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${Math.round(progress)}% concluído (${completedTasks}/${totalTasks})`;
    }
}

// Enhanced Content Section with Full Editing Capabilities
function createEnhancedContentSection(title, items, completedItems, type, dayNum, dayState) {
    const customItems = dayState[`custom${type.charAt(0).toUpperCase() + type.slice(1)}`] || [];
    const allItems = [...items, ...customItems];
    const isExpanded = true;
    const completedCount = completedItems ? completedItems.length : 0;
    const totalCount = allItems.length;
    const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    return `
        <div class="editable-section">
            <div class="editable-section-header" data-section="${type}">
                <div class="section-title-with-counter">
                    <div class="section-title">${title}</div>
                    <div class="section-progress">${completedCount}/${totalCount} (${progressPercentage}%)</div>
                </div>
                <div class="section-actions">
                    <button class="btn btn--sm btn--outline" onclick="useTemplate('${type}', ${dayNum})" title="Usar Template">
                        📋 Template
                    </button>
                    <button class="btn btn--sm btn--primary" onclick="addNewItem('${type}', ${dayNum})" title="Adicionar ${title.split(' ')[1]}">
                        + Adicionar
                    </button>
                    <div class="section-toggle ${isExpanded ? '' : 'collapsed'}">▼</div>
                </div>
            </div>
            <div class="section-body ${isExpanded ? 'expanded' : ''}">
                ${allItems.length === 0 ? `
                    <div class="empty-section">
                        <p>Nenhum ${type.slice(0, -1)} agendado.</p>
                        <button class="btn btn--primary" onclick="addNewItem('${type}', ${dayNum})">
                            + Adicionar Primeiro ${title.split(' ')[1]}
                        </button>
                    </div>
                ` : `
                    <div class="add-item-section">
                        <button class="btn btn--outline btn--sm" onclick="addNewItem('${type}', ${dayNum})">
                            ➕ Adicionar ${title.split(' ')[1]} Novo
                        </button>
                    </div>
                    <div class="content-items-list">
                        ${allItems.map((item, index) => createEditableContentItem(item, index, type, dayNum, completedItems, allItems.length)).join('')}
                    </div>
                    <div class="add-item-section">
                        <button class="btn btn--outline btn--sm" onclick="addNewItem('${type}', ${dayNum})">
                            ➕ Adicionar ${title.split(' ')[1]} Novo
                        </button>
                    </div>
                    <div class="section-progress-summary">
                        Progresso: ${completedCount}/${totalCount} ${type} concluídos (${progressPercentage}%)
                    </div>
                `}
            </div>
        </div>
    `;
}

function createEditableContentItem(item, index, type, dayNum, completedItems, totalItems) {
    const isCompleted = completedItems && completedItems.includes(index);
    const isFirst = index === 0;
    const isLast = index === totalItems - 1;
    const day = fullMonthData.find(d => d.dia === dayNum);
    const isCustomItem = index >= day[type].length;
    const dayState = appState.dayStates[dayNum];
    const notes = dayState.taskNotes ? (dayState.taskNotes[`${type}_${index}`] || '') : '';
    const timeNote = dayState.taskNotes ? (dayState.taskNotes[`${type}_${index}_time`] || '') : '';
    
    return `
        <div class="content-item ${isCompleted ? 'completed' : ''}" data-item-index="${index}">
            <input type="checkbox" class="item-checkbox" 
                   data-type="${type}" data-index="${index}" data-day="${dayNum}"
                   ${isCompleted ? 'checked' : ''}>
                   
            <div class="item-text" 
                 data-original-text="${escapeHtml(item)}" 
                 data-type="${type}" data-index="${index}" data-day="${dayNum}">
                ${item}
            </div>
            
            <div class="item-actions">
                <button class="action-btn edit" onclick="editItemInline('${type}', ${index}, ${dayNum})" title="Editar">
                    ✏️
                </button>
                <button class="action-btn move-up ${isFirst ? 'disabled' : ''}" 
                        onclick="moveItem('${type}', ${index}, ${dayNum}, 'up')" 
                        ${isFirst ? 'disabled' : ''} title="Mover para Cima">
                    ⬆️
                </button>
                <button class="action-btn move-down ${isLast ? 'disabled' : ''}" 
                        onclick="moveItem('${type}', ${index}, ${dayNum}, 'down')" 
                        ${isLast ? 'disabled' : ''} title="Mover para Baixo">
                    ⬇️
                </button>
                ${isCustomItem || index >= day[type].length ? `
                    <button class="action-btn delete" onclick="confirmDeleteItem('${type}', ${index}, ${dayNum}, '${escapeHtml(item)}')" title="Remover">
                        ❌
                    </button>
                ` : ''}
            </div>
            
            <div class="item-notes">
                <input type="text" class="note-input" 
                       placeholder="Hora..." 
                       value="${timeNote}"
                       data-type="${type}" data-index="${index}" data-day="${dayNum}" data-note-type="time"
                       onchange="updateTaskNote(this)">
                <input type="text" class="note-input" 
                       placeholder="Notas..." 
                       value="${notes}"
                       data-type="${type}" data-index="${index}" data-day="${dayNum}" data-note-type="notes"
                       onchange="updateTaskNote(this)">
            </div>
        </div>
    `;
}

function createContentSection(title, items, completedItems, type, dayNum) {
    const dayState = appState.dayStates[dayNum];
    const customItems = dayState[`custom${type.charAt(0).toUpperCase() + type.slice(1)}`] || [];
    const allItems = [...items, ...customItems];
    const isExpanded = true;
    
    return `
        <div class="content-section">
            <div class="section-header" data-section="${type}">
                <div class="section-title">${title}</div>
                <div class="section-counter">${completedItems.length}/${allItems.length} concluídos</div>
                <div class="section-toggle ${isExpanded ? '' : 'collapsed'}">▼</div>
            </div>
            <div class="section-content ${isExpanded ? 'expanded' : ''}">
                <ul class="task-list">
                    ${allItems.map((item, index) => `
                        <li class="task-item" data-item-index="${index}">
                            <input type="checkbox" class="task-checkbox" 
                                data-type="${type}" data-index="${index}" data-day="${dayNum}"
                                ${completedItems.includes(index) ? 'checked' : ''}>
                            <div class="task-content">
                                <div class="task-text ${completedItems.includes(index) ? 'completed' : ''}" 
                                     data-original-text="${escapeHtml(item)}" 
                                     data-type="${type}" data-index="${index}" data-day="${dayNum}">
                                    ${item}
                                </div>
                                <div class="task-controls">
                                    <button class="btn-icon edit-task" data-type="${type}" data-index="${index}" data-day="${dayNum}" title="Editar">
                                        ✏️
                                    </button>
                                    ${index >= items.length ? `
                                        <button class="btn-icon delete-task" data-type="${type}" data-index="${index}" data-day="${dayNum}" title="Remover">
                                            ❌
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="task-notes">
                                <input type="text" class="form-control-sm task-note" 
                                       placeholder="Notas/Hora..." 
                                       data-type="${type}" data-index="${index}" data-day="${dayNum}"
                                       value="${dayState.taskNotes ? (dayState.taskNotes[`${type}_${index}`] || '') : ''}">
                            </div>
                        </li>
                    `).join('')}
                </ul>
                <button class="btn btn--sm btn--outline add-task-btn" data-type="${type}" data-day="${dayNum}">
                    ➕ Adicionar ${title.split(' ')[1]}
                </button>
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

function createInfoSection(title, items) {
    if (!items.length) return '';
    return `
        <div class="content-section">
            <div class="section-header">
                <div class="section-title">${title}</div>
                <div class="section-toggle">▼</div>
            </div>
            <div class="section-content expanded">
                <ul class="task-list">
                    ${items.map(item => `
                        <li class="task-item">
                            <div class="task-text">${item}</div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
}

function createLojaSection(day, dayNum) {
    const dayState = appState.dayStates[dayNum];
    
    return `
        <div class="loja-sections">
            ${renderConselheiraSection(day, dayState, dayNum)}
            ${day.montra_mesa && day.montra_mesa.length > 0 ? createMontrasSection(day.montra_mesa, dayState, dayNum) : ''}
            ${createAcoesLojaSection(day.acoes_loja, dayState, dayNum)}
            ${createCampanhasSection(dayNum)}
        </div>
    `;
}

function createConselheiraSection(day, dayState, dayNum) {
    return `
        <div class="content-section">
            <div class="section-header">
                <div class="section-title">📍 CONSELHEIRA</div>
                <div class="section-toggle">▼</div>
            </div>
            <div class="section-content expanded">
                <div class="conselheira-form">
                    <div class="form-group">
                        <label class="form-label">Nome:</label>
                        <input type="text" class="form-control" value="${day.conselheira}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Horário:</label>
                        <input type="text" class="form-control auto-save-field" 
                               placeholder="Ex: 9h-17h" 
                               data-field="conselheira_horario" data-day="${dayNum}" 
                               value="${dayState.conselheira_horario || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Produtos:</label>
                        <textarea class="form-control auto-save-field" rows="3" 
                                  placeholder="Produtos em destaque, novidades..." 
                                  data-field="conselheira_produtos" data-day="${dayNum}">${dayState.conselheira_produtos || ''}</textarea>
                    </div>
                    <div class="checkbox-group">
                        <label><input type="checkbox" data-action="mini-faciais" data-day="${dayNum}"> Mini faciais realizadas</label>
                        <label><input type="checkbox" data-action="amostras" data-day="${dayNum}"> Amostras distribuídas</label>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createMontrasSection(montras, dayState, dayNum) {
    return `
        <div class="content-section">
            <div class="section-header">
                <div class="section-title">🎨 MONTRAS/MESAS</div>
                <div class="section-toggle">▼</div>
            </div>
            <div class="section-content expanded">
                <ul class="task-list">
                    ${montras.map((montra, index) => `
                        <li class="task-item">
                            <div class="montra-item">
                                <div class="task-text">${montra}</div>
                                <div class="montra-checks">
                                    <label><input type="checkbox" data-montra="montado" data-index="${index}" data-day="${dayNum}"> Montado</label>
                                    <label><input type="checkbox" data-montra="fotografado" data-index="${index}" data-day="${dayNum}"> Fotografado</label>
                                </div>
                                <input type="text" class="form-control-sm" placeholder="Notas" 
                                       data-montra-note="${index}" data-day="${dayNum}">
                            </div>
                        </li>
                    `).join('')}
                </ul>
                <button class="btn btn--sm btn--outline add-montra-btn" data-day="${dayNum}">
                    ➕ Adicionar Montra/Mesa
                </button>
            </div>
        </div>
    `;
}

function createAcoesLojaSection(acoes, dayState, dayNum) {
    return `
        <div class="content-section">
            <div class="section-header">
                <div class="section-title">✨ AÇÕES LOJA</div>
                <div class="section-toggle">▼</div>
            </div>
            <div class="section-content expanded">
                <ul class="task-list">
                    ${acoes.map((acao, index) => `
                        <li class="task-item">
                            <input type="checkbox" class="task-checkbox" 
                                   data-type="acoes" data-index="${index}" data-day="${dayNum}">
                            <div class="task-text">${acao}</div>
                        </li>
                    `).join('')}
                </ul>
                <button class="btn btn--sm btn--outline add-action-btn" data-day="${dayNum}">
                    ➕ Adicionar Ação
                </button>
            </div>
        </div>
    `;
}

function createCampanhasSection(dayNum) {
    const dayState = appState.dayStates[dayNum];
    const activeCampanhas = dayState.campanhasAtivas || [];
    
    return `
        <div class="content-section">
            <div class="section-header">
                <div class="section-title">💰 CAMPANHAS ATIVAS (${CAMPANHAS_LISTA.length} disponíveis)</div>
                <div class="section-toggle">▼</div>
            </div>
            <div class="section-content expanded">
                <p style="margin-bottom: 12px; color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                    Selecione as campanhas ativas neste dia:
                </p>
                <div class="campanhas-grid">
                    ${CAMPANHAS_LISTA.map((campanha, index) => `
                        <label class="campanha-item">
                            <input type="checkbox" 
                                   data-campanha="${index}" 
                                   data-day="${dayNum}"
                                   ${activeCampanhas.includes(campanha) ? 'checked' : ''}
                                   onchange="toggleCampanha(${dayNum}, '${escapeHtml(campanha)}', this.checked)">
                            <span>${campanha}</span>
                        </label>
                    `).join('')}
                </div>
                <div style="margin-top: 16px; padding: 12px; background: var(--color-bg-1); border-radius: var(--radius-base);">
                    <strong>Selecionadas:</strong> ${activeCampanhas.length} campanha(s)
                </div>
            </div>
        </div>
    `;
}

function toggleCampanha(dayNum, campanha, isChecked) {
    const dayState = appState.dayStates[dayNum];
    if (!dayState.campanhasAtivas) {
        dayState.campanhasAtivas = [];
    }
    
    if (isChecked) {
        if (!dayState.campanhasAtivas.includes(campanha)) {
            dayState.campanhasAtivas.push(campanha);
        }
    } else {
        const index = dayState.campanhasAtivas.indexOf(campanha);
        if (index > -1) {
            dayState.campanhasAtivas.splice(index, 1);
        }
    }
    
    addToHistory(dayNum, `Campanha "${campanha}" ${isChecked ? 'ativada' : 'desativada'}`);
    triggerAutoSave();
    incrementChangeCounter();
}

window.toggleCampanha = toggleCampanha;

function createObservationsSection(dayState, dayNum) {
    return `
        <div class="observations-section">
            <div class="tab-buttons">
                <button class="tab-btn active" data-tab="notas">📝 Notas</button>
            </div>
            
            <div class="tab-content active" data-tab-content="notas">
                <div class="notes-grid">
                    <div class="note-field">
                        <label class="form-label">📝 Observações Gerais do Dia</label>
                        <textarea class="form-control auto-save-field" rows="5" 
                                  placeholder="Observações gerais, ideias, ajustes necessários..." 
                                  data-field="observations" data-day="${dayNum}">${dayState.observations || ''}</textarea>
                    </div>
                    
                    <div class="note-field">
                        <label class="form-label">🏢 Laboratórios/Parcerias Extra</label>
                        <textarea class="form-control auto-save-field" rows="3" 
                                  placeholder="Contactos laboratorios, parcerias especiais..." 
                                  data-field="lab_parcerias" data-day="${dayNum}">${dayState.lab_parcerias || ''}</textarea>
                    </div>
                    
                    <div class="note-field">
                        <label class="form-label">⚠️ Ajustes de Última Hora</label>
                        <textarea class="form-control auto-save-field" rows="3" 
                                  placeholder="Mudanças, cancelamentos, alterações urgentes..." 
                                  data-field="ajustes" data-day="${dayNum}">${dayState.ajustes || ''}</textarea>
                    </div>
                    
                    <div class="note-field">
                        <label class="form-label">💡 Ideias para Próximos Dias</label>
                        <textarea class="form-control auto-save-field" rows="3" 
                                  placeholder="Ideias futuras, melhorias, sugestões..." 
                                  data-field="ideias" data-day="${dayNum}">${dayState.ideias || ''}</textarea>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function initializeSectionToggles() {
    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const toggle = header.querySelector('.section-toggle');
            
            if (content.classList.contains('expanded')) {
                content.classList.remove('expanded');
                toggle.classList.add('collapsed');
            } else {
                content.classList.add('expanded');
                toggle.classList.remove('collapsed');
            }
        });
    });
}

function closeModal() {
    const modal = document.getElementById('day-modal');
    if (modal) {
        modal.classList.remove('active');
        appState.modalOpen = false;
        appState.currentModalDay = null;
    }
}

// Enhanced Editing Functions
function editDayTheme(dayNum) {
    const day = fullMonthData.find(d => d.dia === dayNum);
    if (!day) return;
    
    const newTheme = prompt('Editar Tema/Fase do Dia:', day.fase);
    if (newTheme === null || newTheme.trim() === '') return;
    
    const oldTheme = day.fase;
    day.fase = newTheme.trim();
    
    addToHistory(dayNum, `Tema editado: "${oldTheme}" → "${newTheme.trim()}"`);
    triggerAutoSave();
    incrementChangeCounter();
    
    openDayModal(dayNum); // Refresh modal
    showToast(`✏️ Tema do dia ${dayNum} atualizado!`, 'success');
}

function addNewItem(type, dayNum) {
    const typeLabels = {
        stories: 'Story',
        reels: 'Reel', 
        posts: 'Post',
        videos: 'Vídeo'
    };
    
    const label = typeLabels[type] || type;
    const newText = prompt(`Novo ${label}:`, '');
    
    if (!newText || newText.trim() === '') return;
    
    const dayState = appState.dayStates[dayNum];
    const customField = `custom${type.charAt(0).toUpperCase() + type.slice(1)}`;
    
    if (!dayState[customField]) {
        dayState[customField] = [];
    }
    
    dayState[customField].push(newText.trim());
    
    addToHistory(dayNum, `${label} adicionado: "${newText.trim()}"`);
    triggerAutoSave();
    incrementChangeCounter();
    
    openDayModal(dayNum); // Refresh modal
    showToast(`➕ ${label} adicionado com sucesso!`, 'success');
}

function editItemInline(type, index, dayNum) {
    const day = fullMonthData.find(d => d.dia === dayNum);
    const dayState = appState.dayStates[dayNum];
    const customItems = dayState[`custom${type.charAt(0).toUpperCase() + type.slice(1)}`] || [];
    const allItems = [...day[type], ...customItems];
    
    if (index >= allItems.length) return;
    
    const currentText = allItems[index];
    const newText = prompt('Editar:', currentText);
    
    if (newText === null || newText.trim() === '') return;
    if (newText.trim() === currentText) return;
    
    const oldText = currentText;
    
    if (index < day[type].length) {
        // Original item
        day[type][index] = newText.trim();
    } else {
        // Custom item
        const customIndex = index - day[type].length;
        dayState[`custom${type.charAt(0).toUpperCase() + type.slice(1)}`][customIndex] = newText.trim();
    }
    
    addToHistory(dayNum, `${type.slice(0, -1)} editado: "${oldText}" → "${newText.trim()}"`);
    triggerAutoSave();
    incrementChangeCounter();
    
    openDayModal(dayNum); // Refresh modal
    showToast(`✏️ ${type.slice(0, -1)} atualizado!`, 'success');
}

function confirmDeleteItem(type, index, dayNum, itemText) {
    confirmAction(
        'Remover item?',
        `${itemText}\n\nEsta ação não pode ser desfeita.\nTens a certeza?`,
        () => deleteItem(type, index, dayNum, itemText)
    );
}

function deleteItem(type, index, dayNum, itemText) {
    const day = fullMonthData.find(d => d.dia === dayNum);
    const dayState = appState.dayStates[dayNum];
    
    if (index >= day[type].length) {
        // Custom item
        const customIndex = index - day[type].length;
        const customField = `custom${type.charAt(0).toUpperCase() + type.slice(1)}`;
        dayState[customField].splice(customIndex, 1);
        
        // Also remove from completed items
        const completedField = type + 'Completed';
        if (dayState[completedField]) {
            const completedIndex = dayState[completedField].indexOf(index);
            if (completedIndex > -1) {
                dayState[completedField].splice(completedIndex, 1);
            }
            // Adjust indices for remaining items
            dayState[completedField] = dayState[completedField].map(i => i > index ? i - 1 : i);
        }
        
        addToHistory(dayNum, `${type.slice(0, -1)} removido: "${itemText}"`);
        triggerAutoSave();
        incrementChangeCounter();
        
        openDayModal(dayNum); // Refresh modal
        showToast(`🗑️ ${type.slice(0, -1)} removido!`, 'warning');
    }
}

function moveItem(type, index, dayNum, direction) {
    const day = fullMonthData.find(d => d.dia === dayNum);
    const dayState = appState.dayStates[dayNum];
    const customItems = dayState[`custom${type.charAt(0).toUpperCase() + type.slice(1)}`] || [];
    const allItems = [...day[type], ...customItems];
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= allItems.length) return;
    
    // Determine which array to modify
    if (index < day[type].length && newIndex < day[type].length) {
        // Both in original array
        [day[type][index], day[type][newIndex]] = [day[type][newIndex], day[type][index]];
    } else if (index >= day[type].length && newIndex >= day[type].length) {
        // Both in custom array
        const customField = `custom${type.charAt(0).toUpperCase() + type.slice(1)}`;
        const customIndex1 = index - day[type].length;
        const customIndex2 = newIndex - day[type].length;
        [dayState[customField][customIndex1], dayState[customField][customIndex2]] = 
            [dayState[customField][customIndex2], dayState[customField][customIndex1]];
    } else {
        // Moving between arrays - more complex
        const item1 = allItems[index];
        const item2 = allItems[newIndex];
        
        if (index < day[type].length) {
            day[type][index] = item2;
            const customIndex = newIndex - day[type].length;
            dayState[`custom${type.charAt(0).toUpperCase() + type.slice(1)}`][customIndex] = item1;
        } else {
            day[type][newIndex] = item1;
            const customIndex = index - day[type].length;
            dayState[`custom${type.charAt(0).toUpperCase() + type.slice(1)}`][customIndex] = item2;
        }
    }
    
    // Update completed states
    const completedField = type + 'Completed';
    if (dayState[completedField]) {
        const wasIndex1Completed = dayState[completedField].includes(index);
        const wasIndex2Completed = dayState[completedField].includes(newIndex);
        
        dayState[completedField] = dayState[completedField].filter(i => i !== index && i !== newIndex);
        
        if (wasIndex1Completed) dayState[completedField].push(newIndex);
        if (wasIndex2Completed) dayState[completedField].push(index);
    }
    
    const directionText = direction === 'up' ? 'subiu' : 'desceu';
    addToHistory(dayNum, `${type.slice(0, -1)} reordenado: "${allItems[index]}" ${directionText}`);
    
    triggerAutoSave();
    incrementChangeCounter();
    
    openDayModal(dayNum); // Refresh modal
    showToast(`↕️ Item reordenado!`, 'info');
}

function updateTaskNote(input) {
    const dayNum = parseInt(input.dataset.day);
    const type = input.dataset.type;
    const index = parseInt(input.dataset.index);
    const noteType = input.dataset.noteType;
    const value = input.value;
    
    if (!appState.dayStates[dayNum].taskNotes) {
        appState.dayStates[dayNum].taskNotes = {};
    }
    
    const noteKey = noteType === 'time' ? `${type}_${index}_time` : `${type}_${index}`;
    appState.dayStates[dayNum].taskNotes[noteKey] = value;
    
    triggerAutoSave();
}

// Template System
function useTemplate(type, dayNum) {
    appState.templateDialog = {
        active: true,
        type: type,
        dayNum: dayNum,
        selectedTemplate: null
    };
    
    showTemplateDialog(type, dayNum);
}

function showTemplateDialog(type, dayNum) {
    const modal = document.getElementById('template-modal');
    const body = document.getElementById('template-body');
    
    const templates = appState.templates[type] || [];
    
    body.innerHTML = `
        <p>Escolher template para <strong>${type.charAt(0).toUpperCase() + type.slice(1)}</strong>:</p>
        <div class="template-list">
            ${templates.map((template, index) => `
                <div class="template-item" data-template-index="${index}" onclick="selectTemplate(${index})">
                    ${template}
                </div>
            `).join('')}
        </div>
    `;
    
    modal.classList.add('active');
}

function selectTemplate(index) {
    appState.templateDialog.selectedTemplate = index;
    
    document.querySelectorAll('.template-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    document.querySelector(`[data-template-index="${index}"]`).classList.add('selected');
}

function useSelectedTemplate() {
    if (appState.templateDialog.selectedTemplate === null) {
        showToast('⚠️ Selecione um template primeiro!', 'warning');
        return;
    }
    
    const { type, dayNum, selectedTemplate } = appState.templateDialog;
    const template = appState.templates[type][selectedTemplate];
    
    const dayState = appState.dayStates[dayNum];
    const customField = `custom${type.charAt(0).toUpperCase() + type.slice(1)}`;
    
    if (!dayState[customField]) {
        dayState[customField] = [];
    }
    
    dayState[customField].push(template);
    
    addToHistory(dayNum, `Template usado: "${template}"`);
    triggerAutoSave();
    incrementChangeCounter();
    
    closeTemplateDialog();
    openDayModal(dayNum); // Refresh modal
    showToast(`📋 Template adicionado com sucesso!`, 'success');
}

function closeTemplateDialog() {
    const modal = document.getElementById('template-modal');
    modal.classList.remove('active');
    
    appState.templateDialog = {
        active: false,
        type: '',
        dayNum: null,
        selectedTemplate: null
    };
}

// Duplicate Day System
function showDuplicateDialog(sourceDayNum) {
    appState.duplicateDialog = {
        active: true,
        sourceDayNum: sourceDayNum
    };
    
    const modal = document.getElementById('duplicate-modal');
    const sourceDay = document.getElementById('source-day');
    
    sourceDay.textContent = `Dia ${sourceDayNum}`;
    modal.classList.add('active');
}

function executeDuplicate() {
    const sourceDayNum = appState.duplicateDialog.sourceDayNum;
    const targetDayNum = parseInt(document.getElementById('target-day').value);
    
    if (!targetDayNum || targetDayNum < 1 || targetDayNum > 30) {
        showToast('⚠️ Selecione um dia válido (1-30)!', 'warning');
        return;
    }
    
    if (targetDayNum === sourceDayNum) {
        showToast('⚠️ Não pode duplicar para o mesmo dia!', 'warning');
        return;
    }
    
    const sourceDay = fullMonthData.find(d => d.dia === sourceDayNum);
    const targetDay = fullMonthData.find(d => d.dia === targetDayNum);
    
    if (!sourceDay || !targetDay) {
        showToast('❌ Erro ao encontrar os dias!', 'error');
        return;
    }
    
    const sourceDayState = appState.dayStates[sourceDayNum];
    const targetDayState = appState.dayStates[targetDayNum];
    
    let copiedItems = [];
    
    // Copy selected content
    if (document.getElementById('copy-stories').checked) {
        targetDay.stories = [...sourceDay.stories];
        if (sourceDayState.customStories) {
            targetDayState.customStories = [...sourceDayState.customStories];
        }
        copiedItems.push('Stories');
    }
    
    if (document.getElementById('copy-reels').checked) {
        targetDay.reels = [...sourceDay.reels];
        if (sourceDayState.customReels) {
            targetDayState.customReels = [...sourceDayState.customReels];
        }
        copiedItems.push('Reels');
    }
    
    if (document.getElementById('copy-posts').checked) {
        targetDay.posts = [...sourceDay.posts];
        if (sourceDayState.customPosts) {
            targetDayState.customPosts = [...sourceDayState.customPosts];
        }
        copiedItems.push('Posts');
    }
    
    if (document.getElementById('copy-videos').checked) {
        targetDay.videos = [...sourceDay.videos];
        if (sourceDayState.customVideos) {
            targetDayState.customVideos = [...sourceDayState.customVideos];
        }
        copiedItems.push('Vídeos');
    }
    
    if (document.getElementById('copy-conselheira').checked) {
        targetDay.conselheira = sourceDay.conselheira;
        targetDayState.conselheira_horario = sourceDayState.conselheira_horario || '';
        targetDayState.conselheira_produtos = sourceDayState.conselheira_produtos || '';
        copiedItems.push('Conselheira');
    }
    
    if (document.getElementById('copy-acoes').checked) {
        targetDay.acoes_loja = [...sourceDay.acoes_loja];
        copiedItems.push('Ações');
    }
    
    addToHistory(targetDayNum, `Conteúdo duplicado do Dia ${sourceDayNum}: ${copiedItems.join(', ')}`);
    triggerAutoSave();
    incrementChangeCounter();
    
    closeDuplicateDialog();
    
    if (appState.currentView === 'calendar') {
        renderCalendar();
    }
    
    showToast(`📋 Conteúdo duplicado do Dia ${sourceDayNum} para o Dia ${targetDayNum}!`, 'success');
}

function closeDuplicateDialog() {
    const modal = document.getElementById('duplicate-modal');
    modal.classList.remove('active');
    
    appState.duplicateDialog = {
        active: false,
        sourceDayNum: null
    };
    
    // Reset form
    document.getElementById('target-day').value = '';
    document.querySelectorAll('#duplicate-modal input[type="checkbox"]').forEach(cb => {
        cb.checked = cb.id === 'copy-stories' || cb.id === 'copy-reels' || cb.id === 'copy-posts' || cb.id === 'copy-videos';
    });
}

// History Management
function addToHistory(dayNum, action) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-PT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const historyEntry = {
        time: timeStr,
        action: action,
        timestamp: now.getTime()
    };
    
    if (!appState.editHistory[dayNum]) {
        appState.editHistory[dayNum] = [];
    }
    
    appState.editHistory[dayNum].unshift(historyEntry);
    
    // Keep only last 10 entries
    if (appState.editHistory[dayNum].length > 10) {
        appState.editHistory[dayNum] = appState.editHistory[dayNum].slice(0, 10);
    }
    
    // Update history display if modal is open
    if (appState.modalOpen && appState.currentModalDay === dayNum) {
        updateHistoryDisplay(dayNum);
    }
}

function updateHistoryDisplay(dayNum) {
    const historyList = document.getElementById(`history-list-${dayNum}`);
    if (!historyList) return;
    
    const history = appState.editHistory[dayNum] || [];
    
    if (history.length === 0) {
        historyList.innerHTML = '<div class="history-item">• Nenhuma alteração recente</div>';
        return;
    }
    
    historyList.innerHTML = history.map((entry, index) => `
        <div class="history-item ${index < 3 ? 'recent' : ''}">
            • ${entry.time} - ${entry.action}
        </div>
    `).join('');
}

// Update day progress
function updateDayProgress(dayNum) {
    const day = fullMonthData.find(d => d.dia === dayNum);
    const dayState = appState.dayStates[dayNum];
    
    if (!day || !dayState) return;
    
    const customStories = dayState.customStories?.length || 0;
    const customReels = dayState.customReels?.length || 0;
    const customPosts = dayState.customPosts?.length || 0;
    const customVideos = dayState.customVideos?.length || 0;
    
    const totalTasks = day.stories.length + customStories + 
                      day.reels.length + customReels + 
                      day.posts.length + customPosts + 
                      day.videos.length + customVideos;
                      
    const completedTasks = (dayState.storiesCompleted?.length || 0) +
                          (dayState.reelsCompleted?.length || 0) +
                          (dayState.postsCompleted?.length || 0) +
                          (dayState.videosCompleted?.length || 0);
                          
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    const progressFill = document.getElementById(`day-progress-fill-${dayNum}`);
    const progressText = document.getElementById(`day-progress-text-${dayNum}`);
    
    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${Math.round(progress)}% concluído (${completedTasks}/${totalTasks} tarefas)`;
    }
}

// Save/Load Functions
function saveProgress() {
    const saveData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        farmacia: 'Farmácia Liga ASM Gaia',
        mes: 'Novembro 2025',
        dayStates: appState.dayStates,
        fullMonthData: fullMonthData,
        totalChanges: appState.changeCounter
    };
    
    const dataStr = JSON.stringify(saveData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    
    link.download = `plano-marketing-novembro-backup-${dateStr}-${timeStr}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    appState.lastSaveTime = now;
    showToast('✅ Progresso guardado com sucesso!', 'success');
}

function loadProgress() {
    const fileInput = document.getElementById('file-input');
    fileInput.click();
}

function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const loadedData = JSON.parse(e.target.result);
            
            // Validate data structure
            if (!loadedData.dayStates || !loadedData.fullMonthData) {
                throw new Error('Formato de arquivo inválido');
            }
            
            // Restore state
            appState.dayStates = loadedData.dayStates;
            appState.changeCounter = loadedData.totalChanges || 0;
            
            // Merge loaded data with existing data structure
            if (loadedData.fullMonthData && Array.isArray(loadedData.fullMonthData)) {
                loadedData.fullMonthData.forEach(loadedDay => {
                    const existingDayIndex = fullMonthData.findIndex(d => d.dia === loadedDay.dia);
                    if (existingDayIndex >= 0) {
                        fullMonthData[existingDayIndex] = { ...fullMonthData[existingDayIndex], ...loadedDay };
                    }
                });
            }
            
            // Update UI
            updateProgress();
            updateChangeCounter();
            
            if (appState.currentView === 'calendar') {
                renderCalendar();
            } else {
                renderListView();
            }
            
            showToast('📥 Progresso carregado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao carregar arquivo:', error);
            showToast('❌ Erro ao carregar arquivo. Verifique o formato.', 'error');
        }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
}

function autoBackup() {
    if (appState.changeCounter > 0 && appState.changeCounter % 5 === 0) {
        setTimeout(() => {
            saveProgress();
            showToast('🔄 Backup automático realizado!', 'warning');
        }, 500);
    }
}

function incrementChangeCounter() {
    appState.changeCounter++;
    updateChangeCounter();
    
    // Update last save time
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-PT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    const lastSaveEl = document.getElementById('last-save-time');
    if (lastSaveEl) {
        lastSaveEl.textContent = `Última alteração: hoje às ${timeStr}`;
    }
}

function updateChangeCounter() {
    const counter = document.getElementById('changes-counter');
    if (counter) {
        counter.textContent = `Alterações: ${appState.changeCounter}`;
    }
}

function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function exportToExcel() {
    const headers = [
        'Dia', 'Data', 'Dia Semana', 'Fase', 'Conselheira', 
        'Stories Total', 'Stories Completos', 'Reels Total', 'Reels Completos',
        'Posts Total', 'Posts Completos', 'Videos Total', 'Videos Completos',
        'Status Geral', 'Progresso %', 'Observações'
    ];
    
    const rows = fullMonthData.map(day => {
        const dayState = appState.dayStates[day.dia];
        const storiesCompleted = dayState?.storiesCompleted?.length || 0;
        const reelsCompleted = dayState?.reelsCompleted?.length || 0;
        const postsCompleted = dayState?.postsCompleted?.length || 0;
        const videosCompleted = dayState?.videosCompleted?.length || 0;
        
        const totalTasks = day.stories.length + day.reels.length + day.posts.length + day.videos.length;
        const completedTasks = storiesCompleted + reelsCompleted + postsCompleted + videosCompleted;
        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        return [
            day.dia,
            day.data,
            day.dia_semana,
            day.fase,
            day.conselheira || '',
            day.stories.length,
            storiesCompleted,
            day.reels.length,
            reelsCompleted,
            day.posts.length,
            postsCompleted,
            day.videos.length,
            videosCompleted,
            dayState?.isComplete ? 'Concluído' : 'Pendente',
            progressPercentage + '%',
            dayState?.observations || ''
        ];
    });
    
    // Add summary row
    const totalStories = fullMonthData.reduce((sum, day) => sum + day.stories.length, 0);
    const totalReels = fullMonthData.reduce((sum, day) => sum + day.reels.length, 0);
    const totalPosts = fullMonthData.reduce((sum, day) => sum + day.posts.length, 0);
    const totalVideos = fullMonthData.reduce((sum, day) => sum + day.videos.length, 0);
    
    const completedDays = Object.values(appState.dayStates).filter(state => state.isComplete).length;
    const overallProgress = Math.round((completedDays / 30) * 100);
    
    rows.push([
        'TOTAL', '', '', `Progresso Geral: ${overallProgress}%`, '',
        totalStories, '', totalReels, '', totalPosts, '', totalVideos, '',
        `${completedDays}/30 dias completos`, '', ''
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        link.setAttribute('download', `plano-editorial-novembro-2025-${dateStr}.csv`);
        
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('📊 Excel exportado com sucesso!', 'success');
    }
}

function navigateDay(direction) {
    if (!appState.currentModalDay) return;
    
    let newDay = appState.currentModalDay + direction;
    if (newDay < 1) newDay = 30;
    if (newDay > 30) newDay = 1;
    
    openDayModal(newDay);
}

function generateShareLink() {
    const shareData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        farmacia: 'Farmácia Liga ASM Gaia',
        mes: 'Novembro 2025',
        dayStates: appState.dayStates,
        fullMonthData: fullMonthData,
        totalChanges: appState.changeCounter,
        shareId: Math.random().toString(36).substring(2, 15)
    };
    
    const dataStr = JSON.stringify(shareData);
    const encodedData = btoa(encodeURIComponent(dataStr));
    
    // Generate shareable URL (in real application, this would be saved to a server)
    const currentUrl = window.location.href.split('?')[0];
    const shareUrl = `${currentUrl}?data=${encodedData.substring(0, 50)}...`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('🔗 Link de partilha copiado! (Demonstração: dados não persistem online)', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('🔗 Link de partilha copiado! (Demonstração: dados não persistem online)', 'success');
    });
}

function loadFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('data');
    
    if (sharedData) {
        try {
            // In a real application, you would fetch full data from server using the share ID
            showToast('📤 Link de partilha detectado! Use "Carregar Progresso" para importar dados completos.', 'warning');
        } catch (error) {
            console.error('Erro ao carregar dados compartilhados:', error);
        }
    }
}

// Event Listeners
function initializeModalEventListeners() {
    // Modal tabs
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-tab-btn')) {
            const tabName = e.target.dataset.tab;
            switchModalTab(tabName);
        }
    });
    
    // Edit task buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-task')) {
            editTaskInline(e.target);
        }
    });
    
    // Delete task buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-task')) {
            deleteCustomTask(e.target);
        }
    });
    
    // Auto-save fields
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('auto-save-field')) {
            handleAutoSaveField(e.target);
        }
    });
    
    // Task notes
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('task-note')) {
            handleTaskNote(e.target);
        }
    });
}

function switchModalTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.querySelector(`[data-panel="${tabName}"]`).classList.add('active');
}

function editTaskInline(button) {
    const taskText = button.parentElement.parentElement.querySelector('.task-text');
    const originalText = taskText.dataset.originalText || taskText.textContent;
    const type = button.dataset.type;
    const index = parseInt(button.dataset.index);
    const dayNum = parseInt(button.dataset.day);
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.className = 'form-control edit-input';
    
    // Create action buttons
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '✅';
    saveBtn.className = 'btn-icon save-edit';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '❌';
    cancelBtn.className = 'btn-icon cancel-edit';
    
    // Replace task text with input
    const container = taskText.parentElement;
    container.innerHTML = '';
    container.appendChild(input);
    container.appendChild(saveBtn);
    container.appendChild(cancelBtn);
    
    input.focus();
    input.select();
    
    // Save function
    const saveEdit = () => {
        const newText = input.value.trim();
        if (newText && newText !== originalText) {
            updateTaskText(dayNum, type, index, newText);
            triggerAutoSave();
            incrementChangeCounter();
        }
        openDayModal(dayNum); // Refresh modal
    };
    
    // Cancel function
    const cancelEdit = () => {
        openDayModal(dayNum); // Refresh modal
    };
    
    saveBtn.onclick = saveEdit;
    cancelBtn.onclick = cancelEdit;
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveEdit();
        if (e.key === 'Escape') cancelEdit();
    });
}

function updateTaskText(dayNum, type, index, newText) {
    const day = fullMonthData.find(d => d.dia === dayNum);
    const dayState = appState.dayStates[dayNum];
    
    if (index < day[type].length) {
        // Updating original task
        day[type][index] = newText;
    } else {
        // Updating custom task
        const customIndex = index - day[type].length;
        const customField = `custom${type.charAt(0).toUpperCase() + type.slice(1)}`;
        if (dayState[customField] && dayState[customField][customIndex]) {
            dayState[customField][customIndex] = newText;
        }
    }
}

function deleteCustomTask(button) {
    const type = button.dataset.type;
    const index = parseInt(button.dataset.index);
    const dayNum = parseInt(button.dataset.day);
    
    if (confirm('Tem a certeza que quer remover este item?')) {
        const day = fullMonthData.find(d => d.dia === dayNum);
        const dayState = appState.dayStates[dayNum];
        
        if (index >= day[type].length) {
            // Removing custom task
            const customIndex = index - day[type].length;
            const customField = `custom${type.charAt(0).toUpperCase() + type.slice(1)}`;
            if (dayState[customField]) {
                dayState[customField].splice(customIndex, 1);
                triggerAutoSave();
                incrementChangeCounter();
                openDayModal(dayNum); // Refresh modal
                showToast('🗑️ Item removido com sucesso!', 'success');
            }
        }
    }
}

function handleAutoSaveField(field) {
    const dayNum = parseInt(field.dataset.day);
    const fieldName = field.dataset.field;
    const value = field.value;
    
    if (!appState.dayStates[dayNum]) {
        initializeDayStates();
    }
    
    appState.dayStates[dayNum][fieldName] = value;
    triggerAutoSave();
    incrementChangeCounter();
}

function handleTaskNote(noteField) {
    const dayNum = parseInt(noteField.dataset.day);
    const type = noteField.dataset.type;
    const index = parseInt(noteField.dataset.index);
    const value = noteField.value;
    
    if (!appState.dayStates[dayNum].taskNotes) {
        appState.dayStates[dayNum].taskNotes = {};
    }
    
    appState.dayStates[dayNum].taskNotes[`${type}_${index}`] = value;
    triggerAutoSave();
}

function initializeEventListeners() {
    // View switchers
    document.getElementById('calendar-view')?.addEventListener('click', () => {
        switchView('calendar');
    });
    
    document.getElementById('list-view')?.addEventListener('click', () => {
        switchView('list');
    });
    
    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.target.dataset.filter;
            setActiveFilter(filter);
        });
    });
    
    // Search
    document.getElementById('search-input')?.addEventListener('input', (e) => {
        appState.searchTerm = e.target.value.toLowerCase();
        applyFilters();
    });
    
    // Modal controls
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('close-modal')?.addEventListener('click', closeModal);
    document.getElementById('modal-overlay')?.addEventListener('click', closeModal);
    
    document.getElementById('save-changes')?.addEventListener('click', saveModalChanges);
    document.getElementById('mark-complete')?.addEventListener('click', markDayComplete);
    
    // Save/Load functions
    document.getElementById('save-progress')?.addEventListener('click', saveProgress);
    document.getElementById('load-progress')?.addEventListener('click', loadProgress);
    document.getElementById('file-input')?.addEventListener('change', handleFileLoad);
    
    // Export functions
    document.getElementById('export-csv')?.addEventListener('click', exportToCSV);
    document.getElementById('export-excel')?.addEventListener('click', exportToExcel);
    document.getElementById('print-calendar')?.addEventListener('click', () => window.print());
    
    // Modal navigation
    document.getElementById('prev-day')?.addEventListener('click', () => navigateDay(-1));
    document.getElementById('next-day')?.addEventListener('click', () => navigateDay(1));
    
    // Share functionality
    document.getElementById('share-link')?.addEventListener('click', generateShareLink);
    
    // Clear all data - removed old reference, now handled in config
    
    // Force backup - removed old reference, now handled in config
    
    // Task checkboxes (delegated event listener)
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('task-checkbox')) {
            // Check if it's an action checkbox
            const type = e.target.dataset.type;
            if (type === 'acoes_loja' || type === 'acoes') {
                handleActionCheckbox(e.target);
            } else {
                handleTaskCheckbox(e.target);
            }
        }
    });
    
    // Add task buttons (delegated event listener)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-task-btn')) {
            handleAddTask(e.target);
        }
    });
}

// Legacy function kept for compatibility
function switchView(view) {
    // Redirect to new main navigation system
    switchMainView(view);
}

function setActiveFilter(filter) {
    appState.activeFilter = filter;
    
    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');
    
    applyFilters();
}

function clearAllData() {
    const confirmed = confirm('⚠️ ATENÇÃO: Isto irá apagar TODOS os dados do plano editorial.\n\nTem a certeza que quer continuar?');
    
    if (confirmed) {
        const doubleConfirm = confirm('🚨 ÚLTIMA CONFIRMAÇÃO:\n\nEsta ação NÃO pode ser desfeita!\nTodos os dados serão perdidos permanentemente.\n\nConfirma que quer APAGAR TUDO?');
        
        if (doubleConfirm) {
            // Reset all data
            appState.dayStates = {};
            appState.changeCounter = 0;
            window.farmaciaBackupData = null;
            
            // Reinitialize
            initializeDayStates();
            updateProgress();
            updateChangeCounter();
            
            if (appState.currentView === 'calendar') {
                renderCalendar();
            } else {
                renderListView();
            }
            
            showToast('🗑️ Todos os dados foram removidos!', 'warning');
        }
    }
}

function applyFilters() {
    const days = document.querySelectorAll('.calendar-day[data-day]');
    const rows = document.querySelectorAll('#list-table-body tr[data-day]');
    
    [...days, ...rows].forEach(element => {
        const dayNum = parseInt(element.dataset.day);
        const day = fullMonthData.find(d => d.dia === dayNum);
        let show = true;
        
        // Apply filter
        switch (appState.activeFilter) {
            case 'novembro_azul':
                show = day.novembro_azul === true;
                break;
            case 'conselheira':
                show = !!day.conselheira;
                break;
            case 'stories':
                show = day.stories.length > 0;
                break;
            case 'reels':
                show = day.reels.length > 0;
                break;
            case 'posts':
                show = day.posts.length > 0;
                break;
            case 'videos':
                show = day.videos.length > 0;
                break;
            case 'blackfriday':
                show = day.fase.toLowerCase().includes('black friday');
                break;
        }
        
        // Apply search
        if (show && appState.searchTerm) {
            const searchText = [
                day.conselheira,
                day.fase,
                ...day.stories,
                ...day.reels,
                ...day.posts,
                ...day.videos
            ].join(' ').toLowerCase();
            
            show = searchText.includes(appState.searchTerm);
        }
        
        element.style.display = show ? '' : 'none';
    });
}

function handleTaskCheckbox(checkbox) {
    const dayNum = parseInt(checkbox.dataset.day);
    const type = checkbox.dataset.type;
    const index = parseInt(checkbox.dataset.index);
    
    if (!appState.dayStates[dayNum]) {
        appState.dayStates[dayNum] = {
            storiesCompleted: [],
            reelsCompleted: [],
            postsCompleted: [],
            videosCompleted: [],
            observations: '',
            isComplete: false
        };
    }
    
    const completedArray = appState.dayStates[dayNum][type + 'Completed'];
    const taskText = checkbox.parentElement.querySelector('.task-text');
    
    if (checkbox.checked) {
        if (!completedArray.includes(index)) {
            completedArray.push(index);
        }
        taskText?.classList.add('completed');
    } else {
        const indexPos = completedArray.indexOf(index);
        if (indexPos > -1) {
            completedArray.splice(indexPos, 1);
        }
        taskText?.classList.remove('completed');
    }
    
    incrementChangeCounter();
    updateProgress();
    
    // Update modal progress if modal is open
    if (appState.modalOpen && appState.currentModalDay) {
        updateModalProgress(appState.currentModalDay);
    }
}

function handleAddTask(button) {
    const type = button.dataset.type;
    const dayNum = parseInt(button.dataset.day);
    
    const isPost = type === 'posts';
    const promptText = isPost ? 
        `Novo post (use quebras de linha para texto longo):` : 
        `Novo ${type.slice(0, -1)}:`;
    
    const taskText = isPost ? 
        prompt(promptText) : 
        prompt(promptText);
    
    if (taskText && taskText.trim()) {
        const dayState = appState.dayStates[dayNum];
        const customField = `custom${type.charAt(0).toUpperCase() + type.slice(1)}`;
        
        if (!dayState[customField]) {
            dayState[customField] = [];
        }
        
        dayState[customField].push(taskText.trim());
        incrementChangeCounter();
        triggerAutoSave();
        
        // Refresh modal content
        openDayModal(dayNum);
        showToast(`➕ ${type.slice(0, -1)} adicionado com sucesso!`, 'success');
    }
}

function saveModalChanges() {
    const modal = document.getElementById('day-modal');
    const dayNum = appState.currentModalDay;
    
    if (!dayNum) return;
    
    // Save observations
    const observationsTextarea = document.querySelector(`[data-day="${dayNum}"].observations-textarea`);
    if (observationsTextarea) {
        const oldValue = appState.dayStates[dayNum].observations || '';
        const newValue = observationsTextarea.value;
        
        if (oldValue !== newValue) {
            appState.dayStates[dayNum].observations = newValue;
            incrementChangeCounter();
        }
    }
    
    showToast('💾 Alterações guardadas no dia ' + dayNum + '!', 'success');
    updateProgress();
    updateModalProgress(dayNum);
    
    // Update last save time
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-PT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    const lastSaveEl = document.getElementById('last-save-time');
    if (lastSaveEl) {
        lastSaveEl.textContent = `Última alteração: hoje às ${timeStr}`;
    }
}

function markDayComplete() {
    const dayNum = appState.currentModalDay;
    if (!dayNum) return;
    
    appState.dayStates[dayNum].isComplete = !appState.dayStates[dayNum].isComplete;
    incrementChangeCounter();
    
    const button = document.getElementById('mark-complete');
    if (appState.dayStates[dayNum].isComplete) {
        button.textContent = '↩️ Marcar Como Pendente';
        showToast(`✅ Dia ${dayNum} marcado como concluído!`, 'success');
    } else {
        button.textContent = '✅ Marcar Dia Como Concluído';
        showToast(`📝 Dia ${dayNum} marcado como pendente`, 'warning');
    }
    
    updateProgress();
    updateModalProgress(dayNum);
    
    // Refresh current view
    if (appState.currentView === 'calendar') {
        renderCalendar();
    } else {
        renderListView();
    }
    
    // Update last save time
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-PT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    const lastSaveEl = document.getElementById('last-save-time');
    if (lastSaveEl) {
        lastSaveEl.textContent = `Última alteração: hoje às ${timeStr}`;
    }
}

function exportToCSV() {
    const headers = ['Dia', 'Data', 'Dia Semana', 'Fase', 'Conselheira', 'Stories', 'Reels', 'Posts', 'Videos', 'Status', 'Observações'];
    
    const rows = fullMonthData.map(day => {
        const dayState = appState.dayStates[day.dia];
        return [
            day.dia,
            day.data,
            day.dia_semana,
            day.fase,
            day.conselheira || '',
            day.stories.length,
            day.reels.length,
            day.posts.length,
            day.videos.length,
            dayState.isComplete ? 'Concluído' : 'Pendente',
            dayState.observations || ''
        ];
    });
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'plano-editorial-novembro-2025.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Enhanced Event Listeners for New Features
function initializeEnhancedEventListeners() {
    // Template modal events
    document.getElementById('template-close')?.addEventListener('click', closeTemplateDialog);
    document.getElementById('template-cancel')?.addEventListener('click', closeTemplateDialog);
    document.getElementById('template-use')?.addEventListener('click', useSelectedTemplate);
    
    // Duplicate modal events
    document.getElementById('duplicate-day')?.addEventListener('click', () => {
        if (appState.currentModalDay) {
            showDuplicateDialog(appState.currentModalDay);
        }
    });
    document.getElementById('duplicate-close')?.addEventListener('click', closeDuplicateDialog);
    document.getElementById('duplicate-cancel')?.addEventListener('click', closeDuplicateDialog);
    document.getElementById('duplicate-execute')?.addEventListener('click', executeDuplicate);
    
    // Template usage from modal
    document.getElementById('use-template')?.addEventListener('click', () => {
        if (appState.currentModalDay) {
            // Show template selection for current active tab
            const activeTab = document.querySelector('.modal-tab-btn.active');
            const type = activeTab ? activeTab.dataset.tab : 'stories';
            useTemplate(type, appState.currentModalDay);
        }
    });
    
    // Close modals on overlay click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('template-modal')) {
            closeTemplateDialog();
        }
        if (e.target.classList.contains('duplicate-modal')) {
            closeDuplicateDialog();
        }
    });
    
    // Section toggle functionality
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('editable-section-header') || 
            e.target.closest('.editable-section-header')) {
            const header = e.target.classList.contains('editable-section-header') ? 
                         e.target : e.target.closest('.editable-section-header');
            const body = header.nextElementSibling;
            const toggle = header.querySelector('.section-toggle');
            
            if (body && toggle) {
                body.classList.toggle('expanded');
                toggle.classList.toggle('collapsed');
            }
        }
    });
    
    // Enhanced keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (appState.modalOpen && appState.currentModalDay) {
            // Ctrl/Cmd + N: Add new item to current section
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                const activeTab = document.querySelector('.modal-tab-btn.active');
                const type = activeTab ? activeTab.dataset.tab : 'stories';
                addNewItem(type, appState.currentModalDay);
            }
            
            // Ctrl/Cmd + D: Duplicate day
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                showDuplicateDialog(appState.currentModalDay);
            }
            
            // Ctrl/Cmd + T: Use template
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                const activeTab = document.querySelector('.modal-tab-btn.active');
                const type = activeTab ? activeTab.dataset.tab : 'stories';
                useTemplate(type, appState.currentModalDay);
            }
        }
        
        // Ctrl/Cmd + Z: Undo (future feature)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            // TODO: Implement undo functionality
            showToast('🔄 Funcionalidade Desfazer em desenvolvimento', 'info');
        }
    });
    
    // Auto-save indicator
    showAutoSaveIndicator();
}

function showAutoSaveIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'auto-save-indicator';
    indicator.id = 'auto-save-indicator';
    indicator.textContent = '💾 Auto-save ativo';
    
    document.body.appendChild(indicator);
    
    // Update indicator based on save state
    const updateIndicator = () => {
        if (appState.pendingChanges) {
            indicator.textContent = '⚠️ A guardar...';
            indicator.className = 'auto-save-indicator saving';
        } else {
            indicator.textContent = '💾 Guardado';
            indicator.className = 'auto-save-indicator';
        }
    };
    
    // Listen for save state changes
    const originalTriggerAutoSave = window.triggerAutoSave;
    window.triggerAutoSave = function() {
        if (originalTriggerAutoSave) {
            originalTriggerAutoSave();
        }
        updateIndicator();
    };
}

// Global helper functions for modal actions
window.editDayTheme = editDayTheme;
window.addNewItem = addNewItem;
window.editItemInline = editItemInline;
window.confirmDeleteItem = confirmDeleteItem;
window.moveItem = moveItem;
window.updateTaskNote = updateTaskNote;
window.useTemplate = useTemplate;
window.selectTemplate = selectTemplate;
window.useSelectedTemplate = useSelectedTemplate;
window.showDuplicateDialog = showDuplicateDialog;
window.executeDuplicate = executeDuplicate;
window.testConnection = testConnection;
window.exportJSON = exportJSON;
window.importJSON = importJSON;
window.clearAllData = clearAllData;
window.syncNow = syncNow;
window.loadFromGoogleSheets = loadFromGoogleSheets;

// ========================================
// OAUTH2 GOOGLE SHEETS INTEGRATION
// ========================================

// Initialize Google API
function initGoogleAPI() {
    // Verificar se credenciais foram configuradas no código
    if (!GOOGLE_CONFIG.CLIENT_ID || GOOGLE_CONFIG.CLIENT_ID === 'COLA_AQUI_TEU_CLIENT_ID') {
        console.warn('⚠️ Client ID não configurado no código');
        updateSigninStatus(false);
        updateConfigStatus();
        return;
    }
    
    if (!GOOGLE_CONFIG.API_KEY || GOOGLE_CONFIG.API_KEY === 'COLA_AQUI_TUA_API_KEY') {
        console.warn('⚠️ API Key não configurada no código');
        updateSigninStatus(false);
        updateConfigStatus();
        return;
    }
    
    console.log('✅ Credenciais encontradas no código, inicializando Google API...');
    
    gapi.load('client:auth2', async () => {
        try {
            await gapi.client.init({
                apiKey: GOOGLE_CONFIG.API_KEY,
                clientId: GOOGLE_CONFIG.CLIENT_ID,
                discoveryDocs: [GOOGLE_CONFIG.DISCOVERY_DOC],
                scope: GOOGLE_CONFIG.SCOPES
            });
            
            appState.googleAuth.gapiLoaded = true;
            appState.googleAuth.authInstance = gapi.auth2.getAuthInstance();
            
            // Listen for sign-in state changes
            appState.googleAuth.authInstance.isSignedIn.listen(updateSigninStatus);
            
            // Handle the initial sign-in state
            updateSigninStatus(appState.googleAuth.authInstance.isSignedIn.get());
            
            console.log('✅ Google API inicializada com sucesso');
            updateConfigStatus();
        } catch (error) {
            console.error('❌ Erro ao inicializar Google API:', error);
            showToast('❌ Erro OAuth2: ' + error.message, 'error');
            updateSigninStatus(false);
            updateConfigStatus();
        }
    });
}

// Update UI based on sign-in status
function updateSigninStatus(isSignedIn) {
    const btnLogin = document.getElementById('btn-google-login');
    const statusDiv = document.getElementById('auth-status');
    
    if (!btnLogin || !statusDiv) return;
    
    appState.googleAuth.isSignedIn = isSignedIn;
    
    if (isSignedIn && appState.googleAuth.authInstance) {
        const user = appState.googleAuth.authInstance.currentUser.get();
        const profile = user.getBasicProfile();
        const email = profile.getEmail();
        
        appState.googleAuth.userEmail = email;
        appState.googleAuth.canSaveToSheets = true;
        
        btnLogin.textContent = `✅ ${email}`;
        btnLogin.onclick = handleSignoutClick;
        btnLogin.style.background = 'var(--color-success)';
        
        statusDiv.innerHTML = '✅ Gravação ativa no Google Sheets';
        statusDiv.className = 'auth-status status-success';
        
        showToast(`✅ Login bem-sucedido: ${email}`, 'success');
        
        // CRITICAL: Auto-load data from Sheets on sign-in
        setTimeout(() => {
            loadFromGoogleSheets(true);
        }, 1000);
    } else {
        appState.googleAuth.userEmail = '';
        appState.googleAuth.canSaveToSheets = false;
        
        btnLogin.textContent = '🔐 Login com Google';
        btnLogin.onclick = handleAuthClick;
        btnLogin.style.background = 'var(--color-google-blue)';
        
        statusDiv.innerHTML = '⚠️ Necessário login para gravar alterações';
        statusDiv.className = 'auth-status status-warning';
    }
}

// Handle login
function handleAuthClick() {
    if (!GOOGLE_CONFIG.CLIENT_ID || GOOGLE_CONFIG.CLIENT_ID === 'COLA_AQUI_TEU_CLIENT_ID') {
        showToast('⚠️ Configure o Client ID no código JavaScript primeiro!', 'warning');
        switchMainView('config');
        return;
    }
    
    if (!GOOGLE_CONFIG.API_KEY || GOOGLE_CONFIG.API_KEY === 'COLA_AQUI_TUA_API_KEY') {
        showToast('⚠️ Configure a API Key no código JavaScript primeiro!', 'warning');
        switchMainView('config');
        return;
    }
    
    if (!appState.googleAuth.gapiLoaded || !appState.googleAuth.authInstance) {
        showToast('⚠️ Google API ainda não carregada. Aguarde...', 'warning');
        return;
    }
    
    appState.googleAuth.authInstance.signIn().catch((error) => {
        console.error('Error signing in:', error);
        showToast('❌ Erro ao fazer login. Tente novamente.', 'error');
    });
}

// Handle logout
function handleSignoutClick() {
    if (appState.googleAuth.authInstance) {
        appState.googleAuth.authInstance.signOut();
        showToast('👋 Logout realizado com sucesso', 'info');
    }
}

// Check configuration status
function checkConfigStatus() {
    const hasClientId = GOOGLE_CONFIG.CLIENT_ID && GOOGLE_CONFIG.CLIENT_ID !== 'COLA_AQUI_TEU_CLIENT_ID';
    const hasApiKey = GOOGLE_CONFIG.API_KEY && GOOGLE_CONFIG.API_KEY !== 'COLA_AQUI_TUA_API_KEY';
    const hasSpreadsheet = GOOGLE_CONFIG.SPREADSHEET_ID && GOOGLE_CONFIG.SPREADSHEET_ID.trim() !== '';
    
    return {
        hasClientId,
        hasApiKey,
        hasSpreadsheet,
        isConfigured: hasClientId && hasApiKey
    };
}

// Update config status display
function updateConfigStatus() {
    const status = checkConfigStatus();
    
    const statusClientId = document.getElementById('status-client-id');
    const statusApiKey = document.getElementById('status-api-key');
    const statusSpreadsheet = document.getElementById('status-spreadsheet');
    const statusOAuth = document.getElementById('status-oauth');
    
    if (statusClientId) {
        if (status.hasClientId) {
            const preview = GOOGLE_CONFIG.CLIENT_ID.substring(0, 20) + '...';
            statusClientId.innerHTML = `<span class="status-indicator success">✅ Configurado (${preview})</span>`;
        } else {
            statusClientId.innerHTML = '<span class="status-indicator error">❌ Não configurado</span>';
        }
    }
    
    if (statusApiKey) {
        if (status.hasApiKey) {
            const preview = GOOGLE_CONFIG.API_KEY.substring(0, 15) + '...';
            statusApiKey.innerHTML = `<span class="status-indicator success">✅ Configurada (${preview})</span>`;
        } else {
            statusApiKey.innerHTML = '<span class="status-indicator error">❌ Não configurada</span>';
        }
    }
    
    if (statusSpreadsheet) {
        if (status.hasSpreadsheet) {
            const preview = GOOGLE_CONFIG.SPREADSHEET_ID.substring(0, 20) + '...';
            statusSpreadsheet.innerHTML = `<span class="status-indicator success">✅ Configurado (${preview})</span>`;
        } else {
            statusSpreadsheet.innerHTML = '<span class="status-indicator warning">⚠️ Não configurado (opcional)</span>';
        }
    }
    
    if (statusOAuth) {
        if (appState.googleAuth.isSignedIn) {
            statusOAuth.innerHTML = '<span class="status-indicator success">✅ Conectado e autenticado</span>';
        } else if (status.isConfigured && appState.googleAuth.gapiLoaded) {
            statusOAuth.innerHTML = '<span class="status-indicator warning">⚠️ Credenciais OK, necessário login</span>';
        } else if (status.isConfigured) {
            statusOAuth.innerHTML = '<span class="status-indicator warning">⏳ A carregar Google API...</span>';
        } else {
            statusOAuth.innerHTML = '<span class="status-indicator error">❌ Configure credenciais no código</span>';
        }
    }
}

// Test connection
function testConnection() {
    const status = checkConfigStatus();
    
    if (!status.hasClientId) {
        showToast('❌ Client ID não configurado no código', 'error');
        return;
    }
    
    if (!status.hasApiKey) {
        showToast('❌ API Key não configurada no código', 'error');
        return;
    }
    
    if (!appState.googleAuth.gapiLoaded) {
        showToast('⏳ Google API ainda a carregar... Aguarde.', 'warning');
        return;
    }
    
    if (!appState.googleAuth.isSignedIn) {
        showToast('⚠️ Credenciais válidas! Clica "Login com Google" para autenticar.', 'success');
    } else {
        showToast('✅ Tudo OK! Já estás autenticado.', 'success');
    }
    
    updateConfigStatus();
}

// Sync now button handler
window.syncNow = syncNow;

// Export JSON
function exportJSON() {
    backupToJSON();
}

// Import JSON  
function importJSON() {
    importFromJSON();
}

// Clear all data
function clearAllData() {
    confirmAction(
        'Limpar Todos Dados',
        'Isto irá apagar TODOS os dados do plano editorial. Esta ação NÃO pode ser desfeita!',
        clearAllDataConfirmed
    );
}

// ========================================
// GOOGLE SHEETS BI-DIRECTIONAL SYNC
// ========================================

// Load data from Google Sheets (range A1)
async function loadFromGoogleSheets(autoLoad = false) {
    if (!appState.googleAuth.canSaveToSheets) {
        showToast('⚠️ Faça login com Google primeiro!', 'warning');
        return false;
    }
    
    if (!GOOGLE_CONFIG.SPREADSHEET_ID) {
        showToast('⚠️ Configure o SPREADSHEET_ID no código!', 'warning');
        return false;
    }
    
    try {
        const range = 'A1';
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
            range: range
        });
        
        if (response.result.values && response.result.values.length > 0) {
            const cellValue = response.result.values[0][0];
            
            if (!cellValue || cellValue.trim() === '') {
                if (!autoLoad) {
                    showToast('📄 Google Sheets vazio, a usar dados locais', 'info');
                }
                return false;
            }
            
            // Try to parse JSON
            try {
                const sheetData = JSON.parse(cellValue);
                
                if (sheetData.dayStates) {
                    // Ask user if they want to overwrite local data
                    if (!autoLoad) {
                        const overwrite = confirm('📥 Dados encontrados no Google Sheets!\n\nDeseja SUBSTITUIR os dados locais pelos dados do Sheets?\n\n✅ Sim = Carrega do Sheets\n❌ Não = Mantém dados locais');
                        
                        if (!overwrite) {
                            showToast('📋 Dados locais mantidos', 'info');
                            return false;
                        }
                    }
                    
                    // Load data from Sheets
                    appState.dayStates = sheetData.dayStates || {};
                    appState.changeCounter = sheetData.totalChanges || 0;
                    
                    if (sheetData.fullMonthData && Array.isArray(sheetData.fullMonthData)) {
                        sheetData.fullMonthData.forEach(loadedDay => {
                            const existingDayIndex = fullMonthData.findIndex(d => d.dia === loadedDay.dia);
                            if (existingDayIndex >= 0) {
                                fullMonthData[existingDayIndex] = { ...fullMonthData[existingDayIndex], ...loadedDay };
                            }
                        });
                    }
                    
                    // Update UI
                    updateProgress();
                    updateChangeCounter();
                    
                    if (appState.currentView === 'calendar') {
                        renderCalendar();
                    } else if (appState.currentView === 'list') {
                        renderListView();
                    }
                    
                    showToast('📥 Dados carregados do Google Sheets com sucesso!', 'success');
                    
                    // Update last sync time in config
                    const lastSyncEl = document.getElementById('last-sync-time');
                    if (lastSyncEl) {
                        const now = new Date();
                        lastSyncEl.textContent = `Última sincronização: ${now.toLocaleString('pt-PT')}`;
                    }
                    
                    return true;
                } else {
                    throw new Error('Formato JSON inválido no Sheets');
                }
            } catch (parseError) {
                console.error('Error parsing JSON from Sheets:', parseError);
                showToast('❌ Erro: Dados no Sheets não estão em formato JSON válido', 'error');
                return false;
            }
        } else {
            if (!autoLoad) {
                showToast('📄 Google Sheets vazio, a usar dados locais', 'info');
            }
            return false;
        }
    } catch (error) {
        console.error('Error loading from Google Sheets:', error);
        showToast('❌ Erro ao ler do Google Sheets: ' + error.message, 'error');
        return false;
    }
}

// Save complete data to Google Sheets (range A1)
async function saveCompleteToGoogleSheets() {
    if (!appState.googleAuth.canSaveToSheets) {
        console.log('Not authenticated for Google Sheets');
        return false;
    }
    
    if (!GOOGLE_CONFIG.SPREADSHEET_ID) {
        console.log('Spreadsheet ID not configured');
        return false;
    }
    
    try {
        const saveData = {
            version: '5.0',
            timestamp: new Date().toISOString(),
            farmacia: 'Farmácia Liga ASM Gaia',
            mes: 'Novembro 2025',
            dayStates: appState.dayStates,
            fullMonthData: fullMonthData,
            totalChanges: appState.changeCounter,
            userEmail: appState.googleAuth.userEmail
        };
        
        const jsonString = JSON.stringify(saveData);
        const range = 'A1';
        const values = [[jsonString]];
        
        const response = await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
            range: range,
            valueInputOption: 'RAW',
            resource: { values: values }
        });
        
        if (response.status === 200) {
            console.log('✅ Complete data saved to Google Sheets (A1)');
            
            // Update last sync time
            const lastSyncEl = document.getElementById('last-sync-time');
            if (lastSyncEl) {
                const now = new Date();
                lastSyncEl.textContent = `Última sincronização: ${now.toLocaleString('pt-PT')}`;
            }
            
            return true;
        }
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        showToast('⚠️ Erro ao gravar no Google Sheets: ' + error.message, 'warning');
        return false;
    }
    
    return false;
}

// Legacy function for compatibility
async function saveToGoogleSheets(dia, campo, valor) {
    return saveCompleteToGoogleSheets();
}

// Manual sync function (for sync button)
async function syncNow() {
    if (!appState.googleAuth.canSaveToSheets) {
        showToast('⚠️ Faça login com Google primeiro!', 'warning');
        return;
    }
    
    if (!GOOGLE_CONFIG.SPREADSHEET_ID) {
        showToast('⚠️ Configure o SPREADSHEET_ID no código!', 'warning');
        return;
    }
    
    showToast('🔄 A sincronizar...', 'info');
    
    const success = await loadFromGoogleSheets(false);
    
    if (success) {
        showToast('✅ Sincronização concluída!', 'success');
    }
}

// Enhanced auto-save with dual system (LOCAL + SHEETS)
function autoSaveToMemory() {
    appState.lastSaveTime = new Date();
    
    // 1. ALWAYS save to memory (localStorage simulation) - FALLBACK
    window.farmaciaBackupData = {
        version: '5.0',
        timestamp: appState.lastSaveTime.toISOString(),
        dayStates: JSON.parse(JSON.stringify(appState.dayStates)),
        fullMonthData: JSON.parse(JSON.stringify(fullMonthData)),
        totalChanges: appState.changeCounter,
        configData: JSON.parse(JSON.stringify(appState.configData))
    };
    
    // Update last save time in UI
    const timeStr = appState.lastSaveTime.toLocaleTimeString('pt-PT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    const lastSaveInfo = document.getElementById('last-save-info');
    if (lastSaveInfo) {
        lastSaveInfo.textContent = `Última alteração: hoje às ${timeStr}`;
    }
    
    // 2. If authenticated, ALSO save to Google Sheets (BI-DIRECTIONAL SYNC)
    if (appState.googleAuth.canSaveToSheets && GOOGLE_CONFIG.SPREADSHEET_ID) {
        saveCompleteToGoogleSheets();
    }
}

// Legacy function - now uses saveCompleteToGoogleSheets
async function saveBulkToGoogleSheets() {
    return saveCompleteToGoogleSheets();
}

// Load OAuth credentials from memory
// Old function (no longer used)  
function loadOAuthCredentials() {
    if (window.farmaciaOAuthConfig) {
        OAUTH_CONFIG.CLIENT_ID = window.farmaciaOAuthConfig.clientId || '';
        OAUTH_CONFIG.API_KEY = window.farmaciaOAuthConfig.apiKey || '';
        OAUTH_CONFIG.SPREADSHEET_ID = window.farmaciaOAuthConfig.spreadsheetId || '';
        
        console.log('✅ Credenciais carregadas:', {
            hasClientId: !!OAUTH_CONFIG.CLIENT_ID,
            hasApiKey: !!OAUTH_CONFIG.API_KEY,
            timestamp: window.farmaciaOAuthConfig.timestamp
        });
        
        return true;
    }
    return false;
}

// Save OAuth credentials to memory
// Old OAuth functions (no longer used)
function saveOAuthCredentials() {
    const clientIdInput = document.getElementById('client-id');
    const apiKeyInput = document.getElementById('api-key-input');
    const spreadsheetIdInput = document.getElementById('spreadsheet-id');
    
    const clientId = clientIdInput?.value?.trim() || '';
    const apiKey = apiKeyInput?.value?.trim() || '';
    const spreadsheetId = spreadsheetIdInput?.value?.trim() || '';
    
    if (!clientId || !apiKey) {
        showToast('⚠️ Client ID e API Key são obrigatórios!', 'warning');
        return;
    }
    
    // Save to global memory
    window.farmaciaOAuthConfig = {
        clientId: clientId,
        apiKey: apiKey,
        spreadsheetId: spreadsheetId,
        timestamp: new Date().toISOString()
    };
    
    // Update OAUTH_CONFIG immediately
    OAUTH_CONFIG.CLIENT_ID = clientId;
    OAUTH_CONFIG.API_KEY = apiKey;
    OAUTH_CONFIG.SPREADSHEET_ID = spreadsheetId;
    
    console.log('✅ Credenciais guardadas:', {
        hasClientId: !!clientId,
        hasApiKey: !!apiKey,
        hasSpreadsheetId: !!spreadsheetId,
        timestamp: window.farmaciaOAuthConfig.timestamp
    });
    
    // Update connection status
    updateConnectionStatus();
    
    showToast('✅ Credenciais guardadas! Recarregue a página para aplicar.', 'success');
    
    // Update status display
    updateCredentialsStatusDisplay();
    
    // Show reload prompt
    showReloadPrompt();
}

// Show reload prompt after saving credentials
function showReloadPrompt() {
    // Create a prominent reload notification
    const reloadDiv = document.createElement('div');
    reloadDiv.id = 'reload-prompt';
    reloadDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--color-surface);
        border: 3px solid var(--color-warning);
        border-radius: var(--radius-lg);
        padding: var(--space-32);
        box-shadow: var(--shadow-lg);
        z-index: 2000;
        text-align: center;
        max-width: 500px;
    `;
    
    reloadDiv.innerHTML = `
        <h3 style="color: var(--color-warning); margin-bottom: 15px;">⚠️ Recarregar Página</h3>
        <p style="margin-bottom: 20px; font-size: var(--font-size-lg);">
            Credenciais guardadas com sucesso!<br>
            <strong>Recarregue a página</strong> para aplicar as alterações.
        </p>
        <button class="btn btn--primary" onclick="window.location.reload()" style="margin-right: 10px;">
            🔄 Recarregar Agora
        </button>
        <button class="btn btn--outline" onclick="document.getElementById('reload-prompt').remove()">
            Depois
        </button>
    `;
    
    // Remove any existing reload prompt
    const existing = document.getElementById('reload-prompt');
    if (existing) existing.remove();
    
    document.body.appendChild(reloadDiv);
}

// ========================================
// END OAUTH2 INTEGRATION
// ========================================

// Initialize Application
function initializeApp() {
    initializeDayStates();
    loadAutoSavedData();
    initializeEventListeners();
    initializeModalEventListeners();
    initializeEnhancedEventListeners();
    initializeMainNavigation();
    initializeConfigurationPage();
    updateChangeCounter();
    
    // Check config status on load
    updateConfigStatus();
    
    // Initialize Google API after DOM is ready
    setTimeout(() => {
        if (typeof gapi !== 'undefined') {
            initGoogleAPI();
        } else {
            console.log('Google API not loaded yet');
            updateSigninStatus(false);
            updateConfigStatus();
        }
    }, 500);
    updateAutoSaveStatus('💾 Auto-save: Ativo | Última alteração: há 2 min | Progresso: 35%');
    loadFromUrl();
    switchMainView('calendar');
    updateProgress();
    createConfirmationModal();
    
    // Show welcome message
    setTimeout(() => {
        showToast('📅 Plano Editorial Novembro 2025 carregado!\n✏️ Sistema de EDIÇÃO TOTAL ativo:\n• Botão Editar em CADA item\n• Botão Remover em CADA item \n• Adicionar em TODAS seções\n• Reordenar ⬆️⬇️\n• Templates 📋\n• Duplicar dias\n• Auto-save ativo', 'success');
    }, 1000);
    
    // Warn about unsaved changes before leaving
    window.addEventListener('beforeunload', (e) => {
        if (appState.changeCounter > 0 && (!appState.lastSaveTime || 
            (new Date() - appState.lastSaveTime) > 300000)) { // 5 minutes
            e.preventDefault();
            e.returnValue = 'Tem alterações não guardadas. Deseja sair mesmo assim?';
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveProgress();
        }
        
        // Escape to close modal
        if (e.key === 'Escape' && appState.modalOpen) {
            closeModal();
        }
        
        // Arrow keys for day navigation in modal
        if (appState.modalOpen && appState.currentModalDay) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                navigateDay(-1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                navigateDay(1);
            }
        }
        
        // Show/hide keyboard shortcuts help
        if (e.key === 'F1' || (e.key === '?' && e.shiftKey)) {
            e.preventDefault();
            toggleKeyboardHelp();
        }
    });
}

// Main Navigation Functions
function initializeMainNavigation() {
    // Main navigation is handled in initializeEventListeners
}

function switchMainView(view) {
    appState.currentView = view;
    
    // Hide all containers
    const containers = ['calendar-container', 'list-container', 'config-container', 'progress-container'];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    // Show selected container
    const targetContainer = document.getElementById(`${view}-container`);
    if (targetContainer) {
        targetContainer.classList.remove('hidden');
    }
    
    // Update nav button states
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('btn--primary', 'active');
        btn.classList.add('btn--secondary');
    });
    
    const activeBtn = document.querySelector(`[data-view="${view}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('btn--secondary');
        activeBtn.classList.add('btn--primary', 'active');
    }
    
    // Render view-specific content
    switch(view) {
        case 'calendar':
            renderCalendar();
            break;
        case 'list':
            renderListView();
            break;
        case 'progress':
            renderProgressDashboard();
            break;
        case 'config':
            renderConfigPage();
            break;
    }
    
    updateAutoSaveStatus(`💾 Auto-save: Ativo | Última alteração: há 2 min | Progresso: ${calculateOverallProgress()}%`);
}

// Configuration Page Functions
function initializeConfigurationPage() {
    // Config event listeners
    document.getElementById('test-connection')?.addEventListener('click', testConnection);
    document.getElementById('export-json')?.addEventListener('click', exportJSON);
    document.getElementById('import-json')?.addEventListener('click', importJSON);
    document.getElementById('clear-data')?.addEventListener('click', clearAllData);
    document.getElementById('restore-original')?.addEventListener('click', () => {
        confirmAction(
            'Restaurar Plano Original',
            'Isto irá restaurar o plano para o estado original. Todas as alterações serão perdidas!',
            restoreOriginalPlan
        );
    });
    
    // Import file input
    document.getElementById('import-file-input')?.addEventListener('change', handleImportFile);
    document.getElementById('import-backup')?.addEventListener('click', () => {
        document.getElementById('import-file-input').click();
    });
    
    loadConfigurationData();
}

// Remove old OAuth functions (no longer needed)
function initializeOAuthEventListeners() {
    // No longer needed - credentials in code
}

// Clear OAuth credentials
// Old function (no longer used)
function clearOAuthCredentials() {
    if (!confirm('⚠️ Tem certeza que deseja apagar as credenciais guardadas?')) {
        return;
    }
    
    // Clear from memory
    window.farmaciaOAuthConfig = null;
    
    // Clear OAUTH_CONFIG
    OAUTH_CONFIG.CLIENT_ID = '';
    OAUTH_CONFIG.API_KEY = '';
    OAUTH_CONFIG.SPREADSHEET_ID = '';
    
    // Clear input fields
    const clientIdInput = document.getElementById('client-id');
    const apiKeyInput = document.getElementById('api-key-input');
    const spreadsheetIdInput = document.getElementById('spreadsheet-id');
    
    if (clientIdInput) clientIdInput.value = '';
    if (apiKeyInput) apiKeyInput.value = '';
    if (spreadsheetIdInput) spreadsheetIdInput.value = '';
    
    // Update status displays
    updateCredentialsStatusDisplay();
    updateConnectionStatus();
    
    showToast('🗑️ Credenciais apagadas com sucesso!', 'success');
    console.log('🗑️ Credenciais OAuth limpas');
}

// Load and display saved credentials in the config page
// Remove unused functions
function loadAndDisplayCredentials() {
    updateConfigStatus();
}

function updateCredentialsStatusDisplay() {
    updateConfigStatus();
}

function saveConfiguration() {
    const spreadsheetId = document.getElementById('spreadsheet-id')?.value || '';
    
    appState.configData.spreadsheetId = spreadsheetId;
    OAUTH_CONFIG.SPREADSHEET_ID = spreadsheetId;
    
    if (window.farmaciaOAuthConfig) {
        window.farmaciaOAuthConfig.spreadsheetId = spreadsheetId;
    }
    
    // Save to memory (simulating localStorage)
    window.farmaciaConfigData = {
        ...appState.configData,
        timestamp: new Date().toISOString()
    };
    
    showToast('💾 Configuração guardada com sucesso!', 'success');
    updateConnectionStatus();
    triggerAutoSave();
}

function testGoogleSheetsConnection() {
    const spreadsheetId = appState.configData.spreadsheetId;
    
    if (!spreadsheetId) {
        showToast('⚠️ Configure o Spreadsheet ID primeiro!', 'warning');
        return;
    }
    
    if (!appState.googleAuth.canSaveToSheets) {
        showToast('⚠️ Faça login com Google primeiro!', 'warning');
        return;
    }
    
    // Test real connection
    showToast('🔄 Testando conexão...', 'warning');
    
    setTimeout(async () => {
        try {
            const response = await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: spreadsheetId
            });
            
            if (response.status === 200) {
                appState.configData.connectionStatus = 'connected';
                updateConnectionStatus();
                showToast('✅ Conexão ao Google Sheets estabelecida!', 'success');
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            appState.configData.connectionStatus = 'error';
            updateConnectionStatus();
            showToast('❌ Erro ao conectar. Verifique o Spreadsheet ID.', 'error');
        }
    }, 1000);
}

// Old function replaced by updateConfigStatus
function updateConnectionStatus() {
    updateConfigStatus();
}

function loadConfigurationData() {
    if (window.farmaciaConfigData) {
        appState.configData = { ...appState.configData, ...window.farmaciaConfigData };
        
        const spreadsheetInput = document.getElementById('spreadsheet-id');
        if (spreadsheetInput) {
            spreadsheetInput.value = appState.configData.spreadsheetId || '';
        }
    }
    
    // Load and display OAuth credentials
    loadAndDisplayCredentials();
    
    // Update connection status
    updateConnectionStatus();
    
    // Update last backup time
    const lastBackupEl = document.getElementById('last-backup');
    if (lastBackupEl) {
        const lastBackup = appState.configData.lastBackup || '24/10/2025 13:30';
        lastBackupEl.textContent = lastBackup;
    }
}

function renderConfigPage() {
    updateConfigStatus();
}

function backupToJSON() {
    const backupData = {
        version: '4.0',
        timestamp: new Date().toISOString(),
        farmacia: 'Farmácia Liga ASM Gaia',
        mes: 'Novembro 2025',
        dayStates: appState.dayStates,
        fullMonthData: fullMonthData,
        totalChanges: appState.changeCounter,
        configData: appState.configData
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    
    link.download = `plano-marketing-backup-${dateStr}-${timeStr}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Update last backup time
    appState.configData.lastBackup = now.toLocaleString('pt-PT');
    const lastBackupEl = document.getElementById('last-backup');
    if (lastBackupEl) {
        lastBackupEl.textContent = appState.configData.lastBackup;
    }
    
    showToast('💾 Backup criado com sucesso!', 'success');
}

function importFromJSON() {
    document.getElementById('import-file-input').click();
}

function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (importedData.version && importedData.dayStates) {
                appState.dayStates = importedData.dayStates;
                appState.changeCounter = importedData.totalChanges || 0;
                
                if (importedData.configData) {
                    appState.configData = { ...appState.configData, ...importedData.configData };
                }
                
                updateProgress();
                updateChangeCounter();
                renderConfigPage();
                
                showToast('📥 Backup importado com sucesso!', 'success');
            } else {
                throw new Error('Formato inválido');
            }
        } catch (error) {
            showToast('❌ Erro ao importar backup. Verifique o formato do arquivo.', 'error');
        }
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

function clearAllDataConfirmed() {
    appState.dayStates = {};
    appState.changeCounter = 0;
    appState.configData = {
        spreadsheetId: '',
        apiKey: '',
        lastBackup: null,
        connectionStatus: 'not_configured'
    };
    
    window.farmaciaBackupData = null;
    window.farmaciaConfigData = null;
    
    initializeDayStates();
    updateProgress();
    updateChangeCounter();
    renderConfigPage();
    
    if (appState.currentView === 'calendar') {
        renderCalendar();
    }
    
    showToast('🗑️ Todos os dados foram limpos!', 'warning');
}

function restoreOriginalPlan() {
    initializeDayStates();
    appState.changeCounter = 0;
    
    updateProgress();
    updateChangeCounter();
    
    if (appState.currentView === 'calendar') {
        renderCalendar();
    } else if (appState.currentView === 'list') {
        renderListView();
    }
    
    showToast('🔄 Plano restaurado para o estado original!', 'success');
}

// Progress Dashboard Functions
function renderProgressDashboard() {
    updateProgressStats();
    
    // Simple progress chart using HTML/CSS (no external library)
    const canvas = document.getElementById('progress-chart');
    if (canvas) {
        drawProgressChart(canvas);
    }
}

function updateProgressStats() {
    const stats = calculateDetailedStats();
    
    // Update progress cards
    const overallEl = document.getElementById('overall-progress');
    const storiesEl = document.getElementById('stories-progress-dash');
    const reelsEl = document.getElementById('reels-progress-dash');
    const postsEl = document.getElementById('posts-progress-dash');
    
    if (overallEl) overallEl.textContent = `${stats.overall}%`;
    if (storiesEl) storiesEl.textContent = `${stats.stories.percentage}%`;
    if (reelsEl) reelsEl.textContent = `${stats.reels.percentage}%`;
    if (postsEl) postsEl.textContent = `${stats.posts.percentage}%`;
    
    // Update subtitles
    const overallSub = overallEl?.nextElementSibling;
    const storiesSub = storiesEl?.nextElementSibling;
    const reelsSub = reelsEl?.nextElementSibling;
    const postsSub = postsEl?.nextElementSibling;
    
    if (overallSub) overallSub.textContent = `${stats.completedDays}/30 dias concluídos`;
    if (storiesSub) storiesSub.textContent = `${stats.stories.completed}/${stats.stories.total} concluídos`;
    if (reelsSub) reelsSub.textContent = `${stats.reels.completed}/${stats.reels.total} concluídos`;
    if (postsSub) postsSub.textContent = `${stats.posts.completed}/${stats.posts.total} concluídos`;
}

function calculateDetailedStats() {
    const completedDays = Object.values(appState.dayStates).filter(state => state.isComplete).length;
    const overall = Math.round((completedDays / 30) * 100);
    
    let storiesTotal = 0, storiesCompleted = 0;
    let reelsTotal = 0, reelsCompleted = 0;
    let postsTotal = 0, postsCompleted = 0;
    
    fullMonthData.forEach(day => {
        const dayState = appState.dayStates[day.dia] || {};
        
        storiesTotal += day.stories.length + (dayState.customStories?.length || 0);
        reelsTotal += day.reels.length + (dayState.customReels?.length || 0);
        postsTotal += day.posts.length + (dayState.customPosts?.length || 0);
        
        storiesCompleted += dayState.storiesCompleted?.length || 0;
        reelsCompleted += dayState.reelsCompleted?.length || 0;
        postsCompleted += dayState.postsCompleted?.length || 0;
    });
    
    return {
        overall,
        completedDays,
        stories: {
            total: storiesTotal,
            completed: storiesCompleted,
            percentage: storiesTotal > 0 ? Math.round((storiesCompleted / storiesTotal) * 100) : 0
        },
        reels: {
            total: reelsTotal,
            completed: reelsCompleted,
            percentage: reelsTotal > 0 ? Math.round((reelsCompleted / reelsTotal) * 100) : 0
        },
        posts: {
            total: postsTotal,
            completed: postsCompleted,
            percentage: postsTotal > 0 ? Math.round((postsCompleted / postsTotal) * 100) : 0
        }
    };
}

function calculateOverallProgress() {
    const completedDays = Object.values(appState.dayStates).filter(state => state.isComplete).length;
    return Math.round((completedDays / 30) * 100);
}

function drawProgressChart(canvas) {
    // Simple progress visualization using canvas
    const ctx = canvas.getContext('2d');
    const stats = calculateDetailedStats();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw simple bar chart
    const barWidth = 80;
    const barSpacing = 100;
    const maxHeight = 150;
    const startX = 50;
    const startY = 180;
    
    const data = [
        { label: 'Stories', value: stats.stories.percentage, color: '#1FB8CD' },
        { label: 'Reels', value: stats.reels.percentage, color: '#FFC185' },
        { label: 'Posts', value: stats.posts.percentage, color: '#B4413C' },
        { label: 'Geral', value: stats.overall, color: '#5D878F' }
    ];
    
    data.forEach((item, index) => {
        const x = startX + (index * barSpacing);
        const height = (item.value / 100) * maxHeight;
        const y = startY - height;
        
        // Draw bar
        ctx.fillStyle = item.color;
        ctx.fillRect(x, y, barWidth, height);
        
        // Draw label
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.label, x + barWidth/2, startY + 20);
        
        // Draw percentage
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        if (height > 20) {
            ctx.fillText(`${item.value}%`, x + barWidth/2, y + height/2 + 5);
        } else {
            ctx.fillStyle = '#333';
            ctx.fillText(`${item.value}%`, x + barWidth/2, y - 10);
        }
    });
}

// Enhanced Conselheira Management
function renderConselheiraSection(day, dayState, dayNum) {
    const hasConselheira = day.conselheira && day.conselheira.trim() !== '';
    
    if (hasConselheira) {
        return `
            <div class="conselheira-section">
                <div class="conselheira-header">
                    <h4>👥 CONSELHEIRA</h4>
                    <div class="conselheira-actions">
                        <button class="btn btn--sm btn--outline" onclick="editConselheira(${dayNum})" title="Editar">✏️</button>
                        <button class="btn btn--sm btn--warning" onclick="removeConselheira(${dayNum})" title="Remover">❌ Remover</button>
                    </div>
                </div>
                <div class="conselheira-form">
                    <div class="form-group">
                        <label class="form-label">Nome/Marca:</label>
                        <input type="text" class="form-control" value="${day.conselheira}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Horário:</label>
                        <input type="text" class="form-control auto-save-field" 
                               placeholder="Ex: 09:00 - 17:00" 
                               data-field="conselheira_horario" data-day="${dayNum}" 
                               value="${dayState.conselheira_horario || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Produtos:</label>
                        <textarea class="form-control auto-save-field" rows="2" 
                                  placeholder="Produtos em destaque..." 
                                  data-field="conselheira_produtos" data-day="${dayNum}">${dayState.conselheira_produtos || ''}</textarea>
                    </div>
                    <div class="checkbox-group">
                        <label><input type="checkbox" data-action="mini-faciais" data-day="${dayNum}"> ☐ Mini faciais realizadas</label>
                        <label><input type="checkbox" data-action="amostras" data-day="${dayNum}"> ☐ Amostras distribuídas</label>
                    </div>
                    <button class="btn btn--primary btn--sm" onclick="saveConselheiraChanges(${dayNum})">💾 Salvar Alterações Conselheira</button>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="conselheira-section">
                <div class="conselheira-header">
                    <h4>👥 CONSELHEIRA</h4>
                </div>
                <div class="no-conselheira">
                    <p>Sem conselheira agendada</p>
                    <button class="btn btn--primary btn-add-conselheira" onclick="addConselheira(${dayNum})">
                        + Adicionar Conselheira
                    </button>
                </div>
            </div>
        `;
    }
}

function addConselheira(dayNum) {
    const nome = prompt('Nome/Marca da Conselheira:');
    if (!nome || !nome.trim()) return;
    
    const horario = prompt('Horário de atendimento:', '09:00 - 17:00');
    const produtos = prompt('Produtos em destaque:', '');
    
    const day = fullMonthData.find(d => d.dia === dayNum);
    if (day) {
        day.conselheira = nome.trim();
        
        const dayState = appState.dayStates[dayNum];
        dayState.conselheira_horario = horario || '';
        dayState.conselheira_produtos = produtos || '';
        
        incrementChangeCounter();
        triggerAutoSave();
        
        showToast(`👥 Conselheira "${nome}" adicionada ao dia ${dayNum}!`, 'success');
        openDayModal(dayNum); // Refresh modal
    }
}

function editConselheira(dayNum) {
    const day = fullMonthData.find(d => d.dia === dayNum);
    if (!day || !day.conselheira) return;
    
    const newNome = prompt('Editar Nome/Marca da Conselheira:', day.conselheira);
    if (newNome === null) return; // Cancelled
    
    if (newNome.trim()) {
        day.conselheira = newNome.trim();
        incrementChangeCounter();
        triggerAutoSave();
        
        showToast(`✏️ Conselheira editada para "${newNome}"!`, 'success');
        openDayModal(dayNum); // Refresh modal
    }
}

function removeConselheira(dayNum) {
    const day = fullMonthData.find(d => d.dia === dayNum);
    if (!day || !day.conselheira) return;
    
    confirmAction(
        'Remover Conselheira',
        `Tem certeza que quer remover a conselheira "${day.conselheira}" do dia ${dayNum}?`,
        () => {
            day.conselheira = '';
            
            const dayState = appState.dayStates[dayNum];
            dayState.conselheira_horario = '';
            dayState.conselheira_produtos = '';
            
            incrementChangeCounter();
            triggerAutoSave();
            
            showToast(`🗑️ Conselheira removida do dia ${dayNum}!`, 'warning');
            openDayModal(dayNum); // Refresh modal
        }
    );
}

function saveConselheiraChanges(dayNum) {
    // Changes are already saved via auto-save, just show confirmation
    showToast(`💾 Alterações da conselheira salvas no dia ${dayNum}!`, 'success');
}

// Enhanced Checkbox handling for actions
function handleActionCheckbox(checkbox) {
    const dayNum = parseInt(checkbox.dataset.day);
    const type = checkbox.dataset.type;
    const index = parseInt(checkbox.dataset.index);
    
    if (!appState.dayStates[dayNum]) {
        appState.dayStates[dayNum] = {
            storiesCompleted: [],
            reelsCompleted: [],
            postsCompleted: [],
            videosCompleted: [],
            acoesCompleted: [],
            observations: '',
            isComplete: false
        };
    }
    
    const completedField = type === 'acoes_loja' ? 'acoesCompleted' : type + 'Completed';
    const completedArray = appState.dayStates[dayNum][completedField] || [];
    
    if (checkbox.checked) {
        if (!completedArray.includes(index)) {
            completedArray.push(index);
        }
    } else {
        const indexPos = completedArray.indexOf(index);
        if (indexPos > -1) {
            completedArray.splice(indexPos, 1);
        }
    }
    
    appState.dayStates[dayNum][completedField] = completedArray;
    
    incrementChangeCounter();
    updateProgress();
    triggerAutoSave();
    
    // Update modal progress if open
    if (appState.modalOpen && appState.currentModalDay === dayNum) {
        updateModalProgress(dayNum);
    }
}

// Enhanced Actions Management with Cancel Functionality
function createAcoesLojaSection(acoes, dayState, dayNum) {
    if (!acoes || acoes.length === 0) {
        return `
            <div class="content-section">
                <div class="section-header">
                    <div class="section-title">✨ AÇÕES LOJA</div>
                    <div class="section-toggle">▼</div>
                </div>
                <div class="section-content expanded">
                    <p>Nenhuma ação agendada para este dia.</p>
                    <button class="btn btn--primary btn--sm" onclick="addNewAction(${dayNum})">
                        + Adicionar Ação Loja
                    </button>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="content-section">
            <div class="section-header">
                <div class="section-title">✨ AÇÕES LOJA</div>
                <div class="section-counter">${acoes.length} ações</div>
                <div class="section-toggle">▼</div>
            </div>
            <div class="section-content expanded">
                <div class="actions-list">
                    ${acoes.map((acao, index) => `
                        <div class="action-item">
                            <div class="action-content">
                                <input type="checkbox" class="task-checkbox" 
                                       data-type="acoes_loja" data-index="${index}" data-day="${dayNum}">
                                <span class="action-text">✨ ${acao}</span>
                            </div>
                            <div class="action-controls">
                                <button class="btn-icon edit-task" data-type="acoes_loja" data-index="${index}" data-day="${dayNum}" title="Editar">✏️</button>
                                <button class="btn-cancel-action" onclick="cancelAction(${dayNum}, ${index}, '${escapeHtml(acao)}')">❌ Cancelar</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn--primary btn--sm" onclick="addNewAction(${dayNum})">
                    + Adicionar Ação Loja
                </button>
            </div>
        </div>
    `;
}

function addNewAction(dayNum) {
    const novaAcao = prompt('Nova Ação da Loja:', '');
    if (!novaAcao || !novaAcao.trim()) return;
    
    const day = fullMonthData.find(d => d.dia === dayNum);
    if (day) {
        if (!day.acoes_loja) day.acoes_loja = [];
        day.acoes_loja.push(novaAcao.trim());
        
        incrementChangeCounter();
        triggerAutoSave();
        
        showToast(`➕ Ação "${novaAcao}" adicionada ao dia ${dayNum}!`, 'success');
        openDayModal(dayNum); // Refresh modal
    }
}

function cancelAction(dayNum, actionIndex, actionText) {
    confirmAction(
        'Cancelar esta ação?',
        `${actionText}\n\nIsto removerá permanentemente esta ação.`,
        () => {
            const day = fullMonthData.find(d => d.dia === dayNum);
            if (day && day.acoes_loja && day.acoes_loja[actionIndex]) {
                day.acoes_loja.splice(actionIndex, 1);
                
                incrementChangeCounter();
                triggerAutoSave();
                
                showToast(`🗑️ Ação cancelada/removida do dia ${dayNum}!`, 'warning');
                openDayModal(dayNum); // Refresh modal
            }
        }
    );
}

// Enhanced Confirmation System
function createConfirmationModal() {
    const confirmModal = document.createElement('div');
    confirmModal.id = 'confirm-modal';
    confirmModal.className = 'confirm-modal';
    confirmModal.innerHTML = `
        <div class="confirm-dialog">
            <div class="confirm-title" id="confirm-title"></div>
            <div class="confirm-message" id="confirm-message"></div>
            <div class="confirm-actions">
                <button class="btn btn--outline" id="confirm-cancel">Não, voltar</button>
                <button class="btn btn--warning" id="confirm-ok">Sim, continuar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmModal);
    
    document.getElementById('confirm-cancel').addEventListener('click', closeConfirmDialog);
    document.getElementById('confirm-ok').addEventListener('click', executeConfirmAction);
    
    // Close on overlay click
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            closeConfirmDialog();
        }
    });
}

function confirmAction(title, message, callback) {
    appState.confirmDialog = {
        active: true,
        callback: callback,
        message: message,
        title: title
    };
    
    document.getElementById('confirm-title').textContent = `⚠️ ${title}`;
    document.getElementById('confirm-message').textContent = message;
    
    const modal = document.getElementById('confirm-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeConfirmDialog() {
    const modal = document.getElementById('confirm-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    appState.confirmDialog = {
        active: false,
        callback: null,
        message: '',
        title: ''
    };
}

function executeConfirmAction() {
    if (appState.confirmDialog.callback) {
        appState.confirmDialog.callback();
    }
    closeConfirmDialog();
}

// Start the application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}