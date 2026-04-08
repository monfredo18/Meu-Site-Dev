/**
 * =============================================================
 * notifications.js — Sistema de Notificações / Eventos
 * =============================================================
 * Classe NotificationSystem (ES6+)
 *
 * Responsabilidades:
 *  - Renderizar cards de eventos a partir de dados JSON simulados
 *  - Persistir IDs lidos no localStorage
 *  - Calcular e exibir o badge de não lidas
 *  - Controlar a abertura/fechamento do Drawer com animações
 *  - Suporte completo a acessibilidade (teclado, aria, Escape)
 *  - Auto-marcar como lido após 1.5s com o drawer aberto
 * =============================================================
 */

/* ----------------------------------------------------------
   FONTE DE DADOS SIMULADA
   Simula um retorno de API com estrutura JSON padronizada.
   Campos: id, titulo, descricao, dataISO, status
   ---------------------------------------------------------- */
const NOTIFICACOES_DATA = [
  {
    id: "notif-001",
    titulo: "Landing Page com 10% de desconto",
    descricao: "Durante está semana teremos um desconto especial para novos clientes que fizerem uma Landing Page. Aproveite!",
    dataISO: "2026-04-07T10:30:00Z",
    status: "evento"
  }
];


/* =============================================================
   CLASSE: NotificationSystem
   ============================================================= */
class NotificationSystem {

  /**
   * @param {Object} config — Configuração opcional
   * @param {number} config.autoReadDelay — ms para auto-leitura (padrão: 1500)
   * @param {string} config.storageKey — chave do localStorage
   * @param {Array}  config.data — array de notificações JSON
   */
  constructor(config = {}) {
    /* --- Configurações --- */
    this.autoReadDelay  = config.autoReadDelay ?? 1500;        // ms
    this.storageKey     = config.storageKey ?? 'notif_read_ids';
    this.data           = config.data ?? [];

    /* --- Estado interno --- */
    this._isOpen       = false;       // Drawer está aberto?
    this._autoReadTimer = null;       // Referência do setTimeout de auto-leitura
    this._readIds      = new Set();   // IDs já lidos (carregados do localStorage)

    /* --- Referências DOM (preenchidas em _bindDOM) --- */
    this.triggerBtn  = null;
    this.badge       = null;
    this.overlay     = null;
    this.drawer      = null;
    this.closeBtn    = null;
    this.list        = null;
    this.countLabel  = null;
    this.markAllBtn  = null;

    /* --- Inicialização --- */
    this._loadReadIdsFromStorage();
    this._bindDOM();
    this._render();
    this._bindEvents();
    this._updateBadge();
    this._triggerInitialBellAnimation();
  }

  /* -----------------------------------------------------------
     PERSISTÊNCIA — localStorage
     ----------------------------------------------------------- */

  /**
   * Carrega os IDs lidos do localStorage para o Set interno.
   */
  _loadReadIdsFromStorage() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this._readIds = new Set(parsed);
        }
      }
    } catch (e) {
      // localStorage indisponível (modo privado extremo, etc.)
      console.warn('[NotificationSystem] Não foi possível acessar o localStorage.', e);
    }
  }

  /**
   * Persiste o Set de IDs lidos no localStorage.
   */
  _saveReadIdsToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify([...this._readIds]));
    } catch (e) {
      console.warn('[NotificationSystem] Falha ao salvar no localStorage.', e);
    }
  }

  /**
   * Marca um ou todos os IDs como lidos e persiste.
   * @param {string|'all'} id — ID da notificação ou 'all'
   */
  _markAsRead(id) {
    if (id === 'all') {
      // Marca todas
      this.data.forEach(n => this._readIds.add(n.id));
    } else {
      this._readIds.add(id);
    }
    this._saveReadIdsToStorage();
  }

  /* -----------------------------------------------------------
     DOM — Referências e Renderização
     ----------------------------------------------------------- */

  /**
   * Captura as referências de todos os elementos DOM do componente.
   */
  _bindDOM() {
    this.triggerBtn = document.getElementById('notif-trigger');
    this.badge      = document.getElementById('notif-badge');
    this.overlay    = document.getElementById('notif-overlay');
    this.drawer     = document.getElementById('notif-drawer');
    this.closeBtn   = document.getElementById('notif-close');
    this.list       = document.getElementById('notif-list');
    this.countLabel = document.getElementById('notif-count-label');
    this.markAllBtn = document.getElementById('notif-mark-all');

    // Validação básica
    if (!this.triggerBtn || !this.drawer) {
      console.error('[NotificationSystem] Elementos DOM necessários não encontrados.');
    }
  }

  /**
   * Renderiza (ou re-renderiza) todos os cards na lista.
   * Limpa o conteúdo anterior e injeta os novos cards com
   * delay de animação escalonado (stagger).
   */
  _render() {
    if (!this.list) return;

    // Limpa a lista
    this.list.innerHTML = '';

    if (this.data.length === 0) {
      // Estado vazio
      this.list.innerHTML = `
        <div class="notif-empty" role="status" aria-live="polite">
          <svg class="notif-empty-icon" xmlns="http://www.w3.org/2000/svg"
            width="40" height="40" viewBox="0 0 24 24" fill="none"
            aria-hidden="true">
            <path stroke="currentColor" stroke-linecap="round"
              stroke-linejoin="round" stroke-width="1.5"
              d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path stroke="currentColor" stroke-linecap="round"
              stroke-linejoin="round" stroke-width="1.5"
              d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <p class="notif-empty-text">Nenhuma atualização por enquanto.</p>
        </div>
      `;
      return;
    }

    // Cria um DocumentFragment para performance (batch DOM update)
    const fragment = document.createDocumentFragment();

    this.data.forEach((notif, index) => {
      const card = this._createCard(notif, index);
      fragment.appendChild(card);
    });

    this.list.appendChild(fragment);

    // Atualiza o label de contagem no cabeçalho
    this._updateCountLabel();

    // Atualiza estado do botão "Marcar todas"
    this._updateMarkAllBtn();
  }

  /**
   * Cria o elemento de um card de notificação.
   * @param {Object} notif — Objeto de notificação
   * @param {number} index — Índice para delay de animação
   * @returns {HTMLElement}
   */
  _createCard(notif, index) {
    const isRead = this._readIds.has(notif.id);

    const article = document.createElement('article');
    article.className = `notif-card${isRead ? ' read' : ''}`;
    article.setAttribute('role', 'listitem');
    article.setAttribute('data-id', notif.id);
    article.setAttribute('aria-label', `${notif.titulo}. ${isRead ? 'Lida.' : 'Não lida.'}`);

    // Delay escalonado para animação de entrada
    article.style.animationDelay = `${index * 60}ms`;

    // Mapa de labels legíveis por status
    const statusLabels = {
      novidade:   'Novidade',
      evento: 'Evento',
      importante: 'Importante'
    };

    const statusLabel = statusLabels[notif.status] ?? notif.status;
    const dataFormatada = this._formatDate(notif.dataISO);

    article.innerHTML = `
      <div class="notif-card-meta">
        <span class="notif-status-badge ${notif.status}" aria-label="Status: ${statusLabel}">
          ${statusLabel}
        </span>
        <time class="notif-card-date" datetime="${notif.dataISO}" title="${this._formatDateFull(notif.dataISO)}">
          ${dataFormatada}
        </time>
      </div>
      <h3 class="notif-card-title">${this._escapeHTML(notif.titulo)}</h3>
      <p class="notif-card-desc">${this._escapeHTML(notif.descricao)}</p>
    `;

    return article;
  }

  /* -----------------------------------------------------------
     LÓGICA DO BADGE
     ----------------------------------------------------------- */

  /**
   * Calcula e atualiza o badge de não lidas no botão trigger.
   * Mostra/oculta e dispara animação de pulse se > 0.
   */
  _updateBadge() {
    if (!this.badge || !this.triggerBtn) return;

    const unreadCount = this.data.filter(n => !this._readIds.has(n.id)).length;

    // Atualiza texto
    this.badge.textContent = unreadCount > 99 ? '99+' : unreadCount;

    // Atualiza aria-label
    this.badge.setAttribute('aria-label',
      unreadCount === 0
        ? 'Sem notificações não lidas'
        : `${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}`
    );

    if (unreadCount === 0) {
      // Esconde o badge
      this.badge.classList.add('hidden');
      this.triggerBtn.classList.remove('has-unread');
    } else {
      // Mostra o badge
      this.badge.classList.remove('hidden');
      this.triggerBtn.classList.add('has-unread');

      // Dispara pulse (remove e re-adiciona para reiniciar animação)
      this.badge.classList.remove('pulse');
      void this.badge.offsetWidth; // force reflow
      this.badge.classList.add('pulse');
    }
  }

  /**
   * Atualiza o label de contagem no cabeçalho do drawer.
   */
  _updateCountLabel() {
    if (!this.countLabel) return;

    const unreadCount = this.data.filter(n => !this._readIds.has(n.id)).length;

    if (unreadCount > 0) {
      this.countLabel.textContent = `${unreadCount} nova${unreadCount > 1 ? 's' : ''}`;
      this.countLabel.style.opacity = '1';
    } else {
      this.countLabel.textContent = 'Todas lidas';
      this.countLabel.style.opacity = '0.5';
    }
  }

  /**
   * Atualiza o estado do botão "Marcar todas como lidas".
   */
  _updateMarkAllBtn() {
    if (!this.markAllBtn) return;

    const hasUnread = this.data.some(n => !this._readIds.has(n.id));
    this.markAllBtn.disabled = !hasUnread;
  }

  /* -----------------------------------------------------------
     CONTROLE DO DRAWER
     ----------------------------------------------------------- */

  /**
   * Abre o drawer com animações e configura acessibilidade.
   */
  open() {
    if (this._isOpen) return;
    this._isOpen = true;

    // Atualiza aria
    this.triggerBtn.setAttribute('aria-expanded', 'true');
    this.drawer.setAttribute('aria-hidden', 'false');
    this.overlay.setAttribute('aria-hidden', 'false');

    // Adiciona classes de animação
    this.overlay.classList.add('active');
    this.drawer.classList.add('open');

    // Bloqueia scroll do body
    document.body.style.overflow = 'hidden';

    // Move o foco para o drawer (acessibilidade)
    // Pequeno delay para aguardar a transição CSS iniciar
    setTimeout(() => {
      this.closeBtn?.focus();
    }, 50);

    // Inicia o timer de auto-leitura
    this._startAutoReadTimer();
  }

  /**
   * Fecha o drawer com animações e restaura o estado.
   */
  close() {
    if (!this._isOpen) return;
    this._isOpen = false;

    // Cancela o timer de auto-leitura se existir
    this._clearAutoReadTimer();

    // Atualiza aria
    this.triggerBtn.setAttribute('aria-expanded', 'false');
    this.drawer.setAttribute('aria-hidden', 'true');
    this.overlay.setAttribute('aria-hidden', 'true');

    // Remove classes de animação
    this.overlay.classList.remove('active');
    this.drawer.classList.remove('open');

    // Restaura scroll do body
    document.body.style.overflow = '';

    // Devolve o foco ao botão trigger (acessibilidade)
    this.triggerBtn?.focus();
  }

  /**
   * Toggle: abre se fechado, fecha se aberto.
   */
  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /* -----------------------------------------------------------
     AUTO-LEITURA
     ----------------------------------------------------------- */

  /**
   * Inicia um timer de 1.5s. Ao expirar, marca todos os itens
   * visíveis como lidos e atualiza o badge + cards.
   */
  _startAutoReadTimer() {
    this._clearAutoReadTimer();

    this._autoReadTimer = setTimeout(() => {
      this._markAllVisibleAsRead();
    }, this.autoReadDelay);
  }

  /**
   * Cancela o timer de auto-leitura caso o drawer seja fechado
   * antes do tempo expirar.
   */
  _clearAutoReadTimer() {
    if (this._autoReadTimer) {
      clearTimeout(this._autoReadTimer);
      this._autoReadTimer = null;
    }
  }

  /**
   * Marca todos os itens não lidos como lidos.
   * Atualiza o DOM, badge e persiste no localStorage.
   */
  _markAllVisibleAsRead() {
    const hadUnread = this.data.some(n => !this._readIds.has(n.id));
    if (!hadUnread) return;

    // Persiste todos como lidos
    this._markAsRead('all');

    // Atualiza visualmente os cards já renderizados
    const cards = this.list?.querySelectorAll('.notif-card');
    cards?.forEach(card => {
      card.classList.add('read');
      const title = card.querySelector('.notif-card-title');
      if (title) title.style.color = '';
      const id = card.getAttribute('data-id');
      card.setAttribute('aria-label',
        `${card.querySelector('.notif-card-title')?.textContent?.trim() ?? 'Notificação'}. Lida.`
      );
    });

    // Zera o badge e atualiza os outros controles
    this._updateBadge();
    this._updateCountLabel();
    this._updateMarkAllBtn();
  }

  /* -----------------------------------------------------------
     EVENTOS
     ----------------------------------------------------------- */

  /**
   * Registra todos os event listeners do componente.
   * Usa arrow functions para preservar o contexto (this).
   */
  _bindEvents() {
    // Botão trigger: toggle do drawer
    this.triggerBtn?.addEventListener('click', () => this.toggle());

    // Botão fechar (X)
    this.closeBtn?.addEventListener('click', () => this.close());

    // Overlay: fecha ao clicar fora
    this.overlay?.addEventListener('click', () => this.close());

    // Botão "Marcar todas como lidas"
    this.markAllBtn?.addEventListener('click', () => {
      this._markAllVisibleAsRead();
    });

    // Tecla Escape: fecha o drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._isOpen) {
        e.preventDefault();
        this.close();
      }
    });

    // Navegação por Tab: mantém o foco dentro do drawer (focus trap)
    this.drawer?.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this._handleFocusTrap(e);
      }
    });
  }

  /**
   * Focus Trap: impede que o foco saia do drawer enquanto ele está aberto.
   * @param {KeyboardEvent} e
   */
  _handleFocusTrap(e) {
    // Todos os elementos focalizáveis dentro do drawer
    const focusable = this.drawer.querySelectorAll(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length === 0) return;

    const firstEl = focusable[0];
    const lastEl  = focusable[focusable.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: se está no primeiro elemento, vai para o último
      if (document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      }
    } else {
      // Tab: se está no último elemento, vai para o primeiro
      if (document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  }

  /* -----------------------------------------------------------
     UTILITÁRIOS
     ----------------------------------------------------------- */

  /**
   * Formata uma data ISO para string amigável relativa.
   * Ex: "Há 2 horas", "Ontem", "3 dias atrás", "12/05/2023"
   * @param {string} isoString
   * @returns {string}
   */
  _formatDate(isoString) {
    const date = new Date(isoString);
    const now  = new Date();
    const diffMs  = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffH   = Math.floor(diffMin / 60);
    const diffD   = Math.floor(diffH / 24);

    if (diffSec < 60)          return 'Agora há pouco';
    if (diffMin < 60)          return `Há ${diffMin} min`;
    if (diffH < 24)            return `Há ${diffH}h`;
    if (diffD === 1)           return 'Ontem';
    if (diffD < 7)             return `Há ${diffD} dias`;

    // Datas mais antigas: formato dd/mm/aaaa
    return date.toLocaleDateString('pt-BR', {
      day:   '2-digit',
      month: '2-digit',
      year:  'numeric'
    });
  }

  /**
   * Formata data completa para o atributo title (tooltip).
   * @param {string} isoString
   * @returns {string}
   */
  _formatDateFull(isoString) {
    return new Date(isoString).toLocaleString('pt-BR', {
      day:    '2-digit',
      month:  'long',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Escapa HTML para evitar XSS ao injetar dados do JSON no DOM.
   * @param {string} str
   * @returns {string}
   */
  _escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /**
   * Dispara a animação do sino no carregamento inicial
   * se houver notificações não lidas.
   */
  _triggerInitialBellAnimation() {
    const hasUnread = this.data.some(n => !this._readIds.has(n.id));
    if (!hasUnread || !this.triggerBtn) return;

    // Pequeno delay para garantir que a página já renderizou
    setTimeout(() => {
      this.triggerBtn.classList.remove('has-unread');
      void this.triggerBtn.offsetWidth; // force reflow
      this.triggerBtn.classList.add('has-unread');
    }, 800);
  }

} // fim da classe NotificationSystem


/* =============================================================
   INICIALIZAÇÃO
   Instancia o sistema quando o DOM estiver pronto.
   ============================================================= */
document.addEventListener('DOMContentLoaded', () => {
  // Expõe a instância globalmente para possível uso externo
  window.notificationSystem = new NotificationSystem({
    data:          NOTIFICACOES_DATA,
    autoReadDelay: 1500,          // 1.5s para auto-marcar como lido
    storageKey:    'dev_notif_read_ids'
  });
});
