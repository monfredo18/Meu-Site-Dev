/* ============================================
   JAVASCRIPT — Dev Freelancer Website
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================
     NAVBAR — scroll effect & active link
     ========================================== */
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link:not(.nav-cta)');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    // Scrolled class
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Active link
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      if (window.scrollY >= sectionTop) {
        current = section.id;
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

  /* ==========================================
     HAMBURGER MENU
     ========================================== */
  const hamburger = document.getElementById('hamburger');
  const navLinksContainer = document.getElementById('navLinks');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinksContainer.classList.toggle('open');
    document.body.style.overflow = navLinksContainer.classList.contains('open') ? 'hidden' : '';
  });

  // Close menu on link click
  navLinksContainer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinksContainer.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  /* ==========================================
     INTERSECTION OBSERVER — fade-up & reveal
     ========================================== */
  const observerOptions = {
    threshold: 0.12,
    rootMargin: '0px 0px -60px 0px'
  };

  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, idx) => {
      if (entry.isIntersecting) {
        // Stagger children
        const delay = entry.target.dataset.delay || 0;
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);
        fadeObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe hero fade-ups with stagger
  document.querySelectorAll('.fade-up').forEach((el, i) => {
    el.dataset.delay = i * 120;
    fadeObserver.observe(el);
  });

  // Observe generic reveals
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.dataset.delay = i * 80;
    fadeObserver.observe(el);
  });

  // Auto-add reveal to cards/sections
  const autoRevealSelectors = [
    '.servico-card',
    '.diferencial-card',
    '.portfolio-card',
    '.processo-step',
    '.sobre-grid > *',
    '.section-header',
    '.sobre-code-snippet',
  ];

  autoRevealSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach((el, i) => {
      if (!el.classList.contains('fade-up') && !el.classList.contains('reveal')) {
        el.classList.add('reveal');
        el.dataset.delay = i * 100;
        fadeObserver.observe(el);
      }
    });
  });

  /* ==========================================
     COUNTER ANIMATION
     ========================================== */
  const counters = document.querySelectorAll('.stat-number[data-target]');

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => counterObserver.observe(counter));

  function animateCounter(el) {
    const target = parseInt(el.dataset.target);
    const duration = 1800;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  /* ==========================================
     SMOOTH SCROLL for all anchor links
     ========================================== */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* ==========================================
     FORM — ENVIO REAL VIA FORMSPREE
     ⚠️ Substitua SEU_FORM_ID pelo ID gerado em formspree.io
     ========================================== */
  const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mgopkgrl';

  const form = document.getElementById('orcamento-form');
  const formSuccess = document.getElementById('form-success');
  const formSubmit = document.getElementById('form-submit');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nome = document.getElementById('nome').value.trim();
      const email = document.getElementById('email').value.trim();
      const whatsapp = document.getElementById('whatsapp').value.trim();
      const tipo = document.getElementById('tipo').value;
      const mensagem = document.getElementById('mensagem').value.trim();

      // Validação básica
      let hasError = false;
      if (!nome) { flashBorder(document.getElementById('nome'), true); hasError = true; }
      if (!email) { flashBorder(document.getElementById('email'), true); hasError = true; }
      if (email && !isValidEmail(email)) { flashBorder(document.getElementById('email'), true); hasError = true; }
      if (hasError) { shakeButton(formSubmit); return; }

      // Verifica se o ID foi configurado
      if (FORMSPREE_ENDPOINT.includes('SEU_FORM_ID_AQUI')) {
        alert('⚠️ Configure o FORMSPREE_ENDPOINT no script.js com seu Form ID (veja as instruções).');
        return;
      }

      // Estado: carregando
      formSubmit.innerHTML = '<span>Enviando...</span><div class="btn-spinner"></div>';
      formSubmit.disabled = true;

      try {
        const response = await fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            nome,
            email,
            whatsapp: whatsapp || 'Não informado',
            tipo_projeto: tipoLabel(tipo),
            mensagem: mensagem || 'Nenhuma mensagem adicional.',
            data_envio: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
          })
        });

        if (response.ok) {
          // ✅ Sucesso
          formSubmit.innerHTML = '<span>✅ Enviado com sucesso!</span>';
          formSuccess.style.display = 'block';

          // Abre WhatsApp com os dados também
          const waText = encodeURIComponent(
            `Olá! Me chamo ${nome} e acabei de enviar uma solicitação pelo site.\n` +
            `Projeto: ${tipoLabel(tipo)}\n` +
            (mensagem ? `Detalhes: ${mensagem}\n` : '') +
            `Contato: ${email}` + (whatsapp ? ` / ${whatsapp}` : '')
          );
          setTimeout(() => {
            window.open(`https://wa.me/5521965437680?text=${waText}`, '_blank');
          }, 800);

          // Reseta após 5s
          setTimeout(() => {
            form.reset();
            formSuccess.style.display = 'none';
            formSubmit.innerHTML = `<span>Enviar Solicitação</span><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7-7 7 7-7 7"/></svg>`;
            formSubmit.disabled = false;
          }, 5000);

        } else {
          const data = await response.json();
          throw new Error(data?.errors?.[0]?.message || 'Erro desconhecido');
        }

      } catch (err) {
        console.error('Formspree error:', err);
        formSubmit.innerHTML = `<span>Enviar Solicitação</span><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7-7 7 7-7 7"/></svg>`;
        formSubmit.disabled = false;
        alert('❌ Falha ao enviar. Verifique sua conexão ou tente pelo WhatsApp.');
      }
    });
  }

  function tipoLabel(val) {
    const map = {
      institucional: 'Site Institucional',
      landing: 'Landing Page',
      sistema: 'Sistema / Automação',
      outro: 'Outro',
    };
    return map[val] || 'Não especificado';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function flashBorder(el, show) {
    if (!el) return;
    if (show) {
      el.style.borderColor = '#E10600';
      el.style.boxShadow = '0 0 0 3px rgba(225,6,0,0.2)';
      setTimeout(() => {
        el.style.borderColor = '';
        el.style.boxShadow = '';
      }, 2500);
    }
  }

  function shakeButton(el) {
    el.style.animation = 'shake 0.4s ease';
    el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
  }

  /* ==========================================
     INJECT EXTRA STYLES (spinner, shake)
     ========================================== */
  const extraStyle = document.createElement('style');
  extraStyle.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-8px); }
      40% { transform: translateX(8px); }
      60% { transform: translateX(-6px); }
      80% { transform: translateX(4px); }
    }
    .btn-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(extraStyle);

  /* ==========================================
     PORTFOLIO CARD — tilt effect (desktop)
     ========================================== */
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.portfolio-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rotateX = ((y - cy) / cy) * -5;
        const rotateY = ((x - cx) / cx) * 5;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* ==========================================
     WHATSAPP FLOAT — show/hide on scroll
     ========================================== */
  const waFloat = document.getElementById('whatsapp-float');
  if (waFloat) {
    // Brief delay before showing
    setTimeout(() => {
      waFloat.style.opacity = '1';
      waFloat.style.transform = 'scale(1)';
    }, 1500);

    waFloat.style.opacity = '0';
    waFloat.style.transform = 'scale(0.5)';
    waFloat.style.transition = 'opacity 0.4s ease, transform 0.4s ease, box-shadow 0.3s ease';
  }

  /* ==========================================
     CURSOR GLOW (subtle red dot — desktop)
     ========================================== */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const cursor = document.createElement('div');
    cursor.id = 'cursor-glow';
    cursor.style.cssText = `
      position: fixed;
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(225,6,0,0.04) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
      transform: translate(-50%, -50%);
      transition: left 0.08s ease, top 0.08s ease;
      will-change: left, top;
    `;
    document.body.appendChild(cursor);

    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });
  }

  console.log('%c Dev Freelancer 🚀 ', 'background:#E10600;color:#fff;font-size:14px;padding:6px 12px;border-radius:4px;font-weight:bold;');
  console.log('%c Site desenvolvido com ❤️ e código limpo.', 'color:#888;font-size:12px;');
});
