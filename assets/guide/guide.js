(function () {
  const root = document.documentElement;
  const narrow = window.matchMedia('(max-width: 760px)');
  const SIDEBAR_KEY = 'guide-sidebar';
  const GROUPS_KEY = 'guide-groups';
  let sidebarFocus = 0;
  let viewportWidth = window.innerWidth;
  let resizeTimer = 0;

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {

    }
  }


  function sidebarOpen() {
    return narrow.matches ? root.classList.contains('g-sidebar-open') : !root.classList.contains('g-sidebar-closed');
  }
  function paintToggle() {
    if (sidebarFocus) cancelAnimationFrame(sidebarFocus);
    sidebarFocus = 0;
    const open = sidebarOpen();
    const sidebar = document.getElementById('g-sidebar');
    sidebar.inert = !open;
    sidebar.setAttribute('aria-hidden', String(!open));
    document.querySelectorAll('[data-sidebar-toggle]').forEach((button) => {
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Hide sidebar' : 'Show sidebar');
      button.title = `${open ? 'Hide' : 'Show'} sidebar (⌘\\)`;
    });
  }
  function setSidebar(open, focusToggle = false) {
    if (narrow.matches) {
      root.classList.toggle('g-sidebar-open', open);
    } else {
      root.classList.toggle('g-sidebar-closed', !open);
      write(SIDEBAR_KEY, open ? 'open' : 'closed');
    }
    paintToggle();
    if (focusToggle) sidebarFocus = requestAnimationFrame(() => {
      sidebarFocus = 0;
      if (sidebarOpen() === open) document.getElementById(open ? 'g-sidebar-hide' : 'g-sidebar-show')?.focus();
    });
  }


  function resizeLayout() {
    if (window.innerWidth === viewportWidth) return;
    viewportWidth = window.innerWidth;
    root.classList.add('g-resizing');
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => root.classList.remove('g-resizing'), 160);
  }

  function readGroups() {
    try {
      return JSON.parse(read(GROUPS_KEY, '{}')) || {};
    } catch (e) {
      return {};
    }
  }


  function filterPages(query) {
    const q = query.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll('.g-group').forEach((group) => {
      let inGroup = 0;
      group.querySelectorAll('.g-tree-link').forEach((link) => {
        const hit = !q || (link.dataset.keywords || link.textContent.toLowerCase()).includes(q);
        link.parentElement.hidden = !hit;
        if (hit) inGroup += 1;
      });
      group.hidden = inGroup === 0;
      if (q && inGroup) group.open = true;
      shown += inGroup;
    });
    const empty = document.querySelector('[data-filter-empty]');
    if (empty) empty.hidden = shown > 0;
  }


  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
  }


  function watchSections() {
    const links = [...document.querySelectorAll('[data-toc-link]')];
    if (!links.length || !('IntersectionObserver' in window)) return;
    const byId = new Map(links.map((link) => [link.hash.slice(1), link]));
    const visible = new Set();
    const mark = () => {
      const first = [...byId.keys()].find((id) => visible.has(id));
      if (!first) return;
      links.forEach((link) => link.classList.toggle('is-active', link === byId.get(first)));
    };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target.id) : visible.delete(entry.target.id)));
        mark();
      },
      { rootMargin: '-90px 0px -55% 0px' }
    );
    byId.forEach((_, id) => {
      const heading = document.getElementById(id);
      if (heading) observer.observe(heading);
    });
  }


  function scaleFrames() {
    document.querySelectorAll('[data-frame-width]').forEach((viewport) => {
      const iframe = viewport.querySelector('iframe');
      const layout = Number(viewport.dataset.frameWidth) || 1280;
      const available = viewport.clientWidth;
      if (!iframe || !available) return;
      const scale = Math.min(1, available / layout);
      viewport.classList.add('is-scaled');
      iframe.style.width = `${layout}px`;
      iframe.style.height = `${viewport.clientHeight / scale}px`;
      iframe.style.transform = `scale(${scale})`;
    });
  }

  function init() {
    paintToggle();
    scaleFrames();
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(scaleFrames);
      document.querySelectorAll('[data-frame-width]').forEach((viewport) => observer.observe(viewport));
    } else {
      window.addEventListener('resize', scaleFrames);
    }
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-sidebar-toggle]')) setSidebar(!sidebarOpen(), true);
      else if (event.target.closest('[data-sidebar-scrim]')) setSidebar(false, true);
      else if (narrow.matches && event.target.closest('.g-tree-link')) setSidebar(false);
    });
    window.addEventListener('resize', resizeLayout, { passive: true });
    narrow.addEventListener('change', () => {
      resizeLayout();
      root.classList.remove('g-sidebar-open');
      paintToggle();
    });

    const groups = readGroups();
    document.querySelectorAll('.g-group').forEach((group) => {
      const key = group.dataset.group;
      const holdsCurrent = group.querySelector('[aria-current="page"]');
      if (!holdsCurrent && key in groups) group.open = groups[key];
      group.addEventListener('toggle', () => {
        const next = readGroups();
        next[key] = group.open;
        write(GROUPS_KEY, JSON.stringify(next));
      });
    });
    const collapse = document.querySelector('[data-collapse-all]');
    if (collapse) {
      collapse.addEventListener('click', () => {
        document.querySelectorAll('.g-group').forEach((group) => {
          group.open = Boolean(group.querySelector('[aria-current="page"]'));
        });
      });
    }

    const filter = document.querySelector('[data-guide-filter]');
    if (filter) {
      filter.addEventListener('input', () => filterPages(filter.value));
      filter.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && filter.value) {
          filter.value = '';
          filterPages('');
        } else if (event.key === 'Enter') {
          const first = document.querySelector('.g-group:not([hidden]) li:not([hidden]) .g-tree-link');
          if (first) window.location.href = first.href;
        }
      });
    }
    const focusFilter = () => {
      if (!filter) return;
      if (narrow.matches || !sidebarOpen()) setSidebar(true);
      filter.focus();
      filter.select();
    };
    document.querySelectorAll('[data-focus-filter]').forEach((button) => button.addEventListener('click', focusFilter));
    document.addEventListener('keydown', (event) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        focusFilter();
      } else if (mod && !event.altKey && event.key === '\\') {
        event.preventDefault();
        setSidebar(!sidebarOpen(), true);
      } else if (event.key === 'Escape' && narrow.matches && sidebarOpen()) {
        setSidebar(false, true);
      }
    });

    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-copy]');
      if (!button) return;
      const source = document.getElementById(button.dataset.copy);
      if (!source) return;
      const label = button.textContent;
      copyText(source.textContent)
        .then(() => {
          button.textContent = 'Copied';
          button.setAttribute('data-copied', '');
        })
        .catch(() => {
          button.textContent = 'Select and copy';
        })
        .finally(() =>
          setTimeout(() => {
            button.textContent = label;
            button.removeAttribute('data-copied');
          }, 1600)
        );
    });

    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-toast]');
      if (!button || !window.citatorToast) return;
      const action = button.dataset.toastAction;
      window.citatorToast({
        title: button.dataset.toast,
        message: button.dataset.toastMessage || '',
        intent: button.dataset.toastIntent || 'neutral',
        duration: button.dataset.toastDuration === undefined ? 4000 : Number(button.dataset.toastDuration),
        action: action ? { label: action, run: () => window.citatorToast({ title: `${action} chosen`, intent: 'positive' }) } : null,
      });
    });

    watchSections();
  }

  document.addEventListener('alpine:init', () => {
    const elsewhere = (what) => () => {
      if (window.citatorToast) {
        window.citatorToast({ title: `${what} works on the opinion page`, message: 'The opinion page provides this control; open a full page to try it.', intent: 'neutral' });
      }
    };
    window.Alpine.data('guideStage', () => ({
      readQuote: elsewhere('Read in the opinion'),
      showPanelSummary: elsewhere('Citator summary'),

      copyCitation() {
        if (typeof caseActionsCopy === 'function') caseActionsCopy(this.$el.dataset.cite || '', 'Citation copied');
      },
      narrowFromCell(event) {
        event.preventDefault();
      },
    }));
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
