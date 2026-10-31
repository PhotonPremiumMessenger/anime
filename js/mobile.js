/* ============================================================
   mobile.js — меню-панель и все панели на телефоне

   На узких экранах ссылки уезжают в выезжающую справа панель
   поверх страницы: затемнение, блокировка прокрутки, кнопка
   закрытия, Esc и клик мимо. На компьютере всё как раньше.

   Главное правило, которое здесь появилось:
   открыта всегда одна панель. Меню, уведомления и панель дизайна
   больше не наезжают друг на друга и не закрываются «за компанию».
   Если из меню открыть уведомления, меню сначала красиво уедет
   вправо, и только потом появится уведомления.

   В меню добавлены быстрые действия: «Уведомления» со счётчиком,
   «Дизайн» и, для гостя, кнопки входа и регистрации.
   ============================================================ */

'use strict';

/* ---------- Какие панели есть на телефоне ---------- */

/** Все выдвижные панели страницы. */
function mobilePanelParts() {
  return {
    drawer: document.querySelector('.nav'),
    notify: document.getElementById('notifyPanel'),
    design: document.getElementById('designPanel')
  };
}

/** Открыта ли панель. */
function mobilePanelIsOpen(element, openClass) {
  return Boolean(element && element.classList.contains(openClass || 'open'));
}

/** Показывает или прячет затемнение под панелями. */
function syncPanelBackdrop() {
  const parts = mobilePanelParts();

  const anyOpen =
    mobilePanelIsOpen(parts.drawer, 'is-mobile-open') ||
    mobilePanelIsOpen(parts.notify) ||
    mobilePanelIsOpen(parts.design);

  document.body.classList.toggle('panel-open', anyOpen);
}

/**
 * Закрывает всё, кроме указанной панели.
 * @param {string} keep — 'drawer' | 'notify' | 'design' | ''
 */
function closeOtherMobilePanels(keep) {
  const parts = mobilePanelParts();

  if (keep !== 'drawer' && mobilePanelIsOpen(parts.drawer, 'is-mobile-open')) {
    closeMobileNav();
  }

  if (keep !== 'notify' && mobilePanelIsOpen(parts.notify)) {
    closeNotifyPanel();
  }

  if (keep !== 'design' && mobilePanelIsOpen(parts.design)) {
    closeDesignPanel();
  }

  syncPanelBackdrop();
}

/* ---------- Меню ---------- */

/** Открывает и закрывает мобильное меню. */
function toggleMobileNav(event) {
  if (event) event.stopPropagation();

  const nav = document.querySelector('.nav');
  const button = document.querySelector('.nav-burger');
  if (!nav) return;

  const open = !nav.classList.contains('is-mobile-open');

  if (open) closeOtherMobilePanels('drawer');

  nav.classList.toggle('is-mobile-open', open);

  if (button) {
    button.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
  }

  document.body.classList.toggle('nav-open', open);

  // Затемнение: пока панель открыта, страница под ней приглушена
  const backdrop = document.querySelector('.nav-backdrop');
  if (backdrop) backdrop.setAttribute('aria-hidden', String(!open));

  // Прокрутка страницы встаёт, пока панель открыта
  document.documentElement.style.overflow = open ? 'hidden' : '';

  syncPanelBackdrop();
}

/** Закрывает меню. */
function closeMobileNav() {
  const nav = document.querySelector('.nav');
  const button = document.querySelector('.nav-burger');

  if (nav) nav.classList.remove('is-mobile-open');
  if (button) {
    button.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
  }

  document.body.classList.remove('nav-open');
  document.documentElement.style.overflow = '';

  syncPanelBackdrop();
}

/** Шапка панели с заголовком и крестиком. */
function buildDrawerHead() {
  const head = document.createElement('div');
  head.className = 'nav-drawer-head';
  head.innerHTML = `
    <span class="nav-drawer-title">Меню</span>
    <button class="nav-drawer-close" type="button" aria-label="Закрыть меню" onclick="closeMobileNav()">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>
  `;
  return head;
}

/** Затемнение под панелью. */
function buildBackdrop() {
  if (document.querySelector('.nav-backdrop')) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'nav-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');

  // Тап по затемнению закрывает то, что открыто
  backdrop.addEventListener('click', () => {
    closeMobileNav();
    if (typeof closeNotifyPanel === 'function') closeNotifyPanel();
    if (typeof closeDesignPanel === 'function') closeDesignPanel();
    syncPanelBackdrop();
  });

  document.body.appendChild(backdrop);
}

/**
 * Быстрые действия в меню: уведомления и дизайн.
 * Именно их не хватало: с телефона до колокольчика было не добраться,
 * не закрыв меню, а панель дизайна открывалась поверх меню.
 */
function buildQuickActions() {
  const nav = document.querySelector('.nav');
  if (!nav || nav.querySelector('.nav-quick')) return;

  const quick = document.createElement('div');
  quick.className = 'nav-quick';

  quick.innerHTML = `
    <button class="nav-quick-btn" type="button" data-mobile-action="notify">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"></path>
        <path d="M10.5 20a2 2 0 0 0 3 0"></path>
      </svg>
      <span>Уведомления</span>
      <span class="nav-quick-count hidden" data-quick-notify-count>0</span>
    </button>
    <button class="nav-quick-btn" type="button" data-mobile-action="design">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9"></circle>
        <circle cx="8.5" cy="9.5" r="1.2"></circle>
        <circle cx="15.5" cy="9.5" r="1.2"></circle>
        <circle cx="9" cy="15" r="1.2"></circle>
        <circle cx="15" cy="15" r="1.2"></circle>
      </svg>
      <span>Дизайн</span>
    </button>
  `;

  quick.addEventListener('click', event => {
    const button = event.target.closest('[data-mobile-action]');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    const action = button.dataset.mobileAction;

    // Сначала меню уезжает вбок, потом открывается панель —
    // иначе одно окно наезжало на другое
    closeMobileNav();

    window.setTimeout(() => {
      if (action === 'notify' && typeof toggleNotifyPanel === 'function') {
        toggleNotifyPanel();
      }

      if (action === 'design' && typeof toggleDesignPanel === 'function') {
        toggleDesignPanel();
      }

      syncPanelBackdrop();
    }, 260);
  });

  nav.insertBefore(quick, nav.querySelector('.nav-link'));
  refreshQuickNotifyCount();
}

/** Обновляет счётчик на кнопке «Уведомления» в меню. */
function refreshQuickNotifyCount() {
  const badge = document.querySelector('[data-quick-notify-count]');
  if (!badge) return;

  const count = typeof getUnreadCount === 'function' ? Number(getUnreadCount()) || 0 : 0;

  badge.textContent = String(count > 9 ? '9+' : count);
  badge.classList.toggle('hidden', count === 0);
}

/** Кнопки входа для гостя: в шапке они уже не помещаются. */
function buildAuthActions() {
  const nav = document.querySelector('.nav');
  if (!nav || nav.querySelector('.nav-auth')) return;

  const authed = typeof isAuthorized === 'function' && isAuthorized();
  if (authed) return;

  const block = document.createElement('div');
  block.className = 'nav-auth';
  block.innerHTML = `
    <a class="btn btn-primary" href="register.html">Регистрация</a>
    <a class="btn btn-ghost" href="register.html">Войти в аккаунт</a>
  `;

  block.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMobileNav));

  const quick = nav.querySelector('.nav-quick');
  nav.insertBefore(block, quick ? quick.nextSibling : nav.querySelector('.nav-link'));
}

/** Кнопка закрытия на панели дизайна: понятный выход для пальца. */
function buildPanelCloseButtons() {
  const design = document.getElementById('designPanel');
  if (design && !design.querySelector('.panel-close')) {
    const button = document.createElement('button');
    button.className = 'panel-close';
    button.type = 'button';
    button.setAttribute('aria-label', 'Закрыть панель');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

    button.addEventListener('click', () => {
      if (typeof closeDesignPanel === 'function') closeDesignPanel();
      syncPanelBackdrop();
    });

    design.insertBefore(button, design.firstChild);
  }
}

/** Добавляет кнопку-бургер и собирает панель. */
function mountMobileNav() {
  const header = document.querySelector('.header .container');
  const nav = document.querySelector('.nav');
  if (!header || !nav || document.querySelector('.nav-burger')) return;

  buildBackdrop();

  const button = document.createElement('button');
  button.className = 'nav-burger';
  button.type = 'button';
  button.setAttribute('aria-label', 'Меню');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span></span><span></span><span></span>';
  button.addEventListener('click', toggleMobileNav);
  header.appendChild(button);

  if (!nav.querySelector('.nav-drawer-head')) {
    nav.insertBefore(buildDrawerHead(), nav.firstChild);
  }

  buildQuickActions();
  buildAuthActions();
  buildPanelCloseButtons();

  // На телефоне панель «Ещё» прячется, поэтому её пункты переносим
  // в меню теми же группами
  const panel = document.querySelector('.nav-more-panel');
  if (panel && !nav.querySelector('.mobile-more')) {
    const more = document.createElement('div');
    more.className = 'mobile-more';

    panel.querySelectorAll('.nav-group').forEach(group => {
      const title = group.querySelector('.nav-group-btn b');
      const titleEl = document.createElement('span');
      titleEl.className = 'mobile-more-title';
      titleEl.textContent = title ? title.textContent : 'Ещё';
      more.appendChild(titleEl);

      group.querySelectorAll('a').forEach(link => {
        const clone = document.createElement('a');
        clone.href = link.getAttribute('href');
        clone.className = 'nav-link';
        clone.innerHTML = '<b>' + link.querySelector('b').textContent + '</b>';
        clone.addEventListener('click', closeMobileNav);
        more.appendChild(clone);
      });
    });

    nav.appendChild(more);
  }

  // Клик по ссылке закрывает меню
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMobileNav));
}

/* ---------- Жесты: панель уезжает за пальцем ---------- */

/**
 * Свайп вправо закрывает выехавшую справа панель,
 * свайп вниз — окошко снизу. Панель при этом уезжает,
 * а не пропадает.
 */
function bindPanelSwipe(element, closeFn, axis) {
  if (!element || element.dataset.swipeBound === '1') return;
  element.dataset.swipeBound = '1';

  let startX = 0;
  let startY = 0;
  let delta = 0;
  let tracking = false;

  const threshold = axis === 'y' ? 90 : 80;

  element.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) return;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    delta = 0;
    tracking = true;
    element.style.transition = 'none';
  }, { passive: true });

  element.addEventListener('touchmove', event => {
    if (!tracking) return;

    const dx = event.touches[0].clientX - startX;
    const dy = event.touches[0].clientY - startY;

    if (axis === 'y') {
      // Вниз — только если панель в самом верху списка
      if (dy <= 0 || element.scrollTop > 0) return;
      delta = dy;
      element.style.transform = 'translateY(' + dy + 'px)';
    } else {
      if (dx <= 0) return;
      delta = dx;
      element.style.transform = 'translateX(' + dx + 'px)';
    }
  }, { passive: true });

  const finish = () => {
    if (!tracking) return;
    tracking = false;

    element.style.transition = '';
    element.style.transform = '';

    if (delta > threshold) closeFn();
    delta = 0;
  };

  element.addEventListener('touchend', finish, { passive: true });
  element.addEventListener('touchcancel', finish, { passive: true });
}

/* ---------- Старт ---------- */

document.addEventListener('DOMContentLoaded', () => {
  mountMobileNav();

  const parts = mobilePanelParts();
  bindPanelSwipe(parts.notify, () => {
    if (typeof closeNotifyPanel === 'function') closeNotifyPanel();
    syncPanelBackdrop();
  }, 'x');

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;

    closeMobileNav();
    syncPanelBackdrop();
  });

  // При переходе на широкий экран меню не должно остаться открытым
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      closeMobileNav();
      syncPanelBackdrop();
    }
  });
});

/* Экспорт в глобальную область */
window.toggleMobileNav = toggleMobileNav;
window.closeMobileNav = closeMobileNav;
window.closeOtherMobilePanels = closeOtherMobilePanels;
window.syncPanelBackdrop = syncPanelBackdrop;
window.refreshQuickNotifyCount = refreshQuickNotifyCount;
