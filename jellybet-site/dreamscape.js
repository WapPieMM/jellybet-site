(() => {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealSelector = [
    '.hero', '.moodboard', '.portfolio-drive-card', '.account-entry-card',
    '.section-block', '.notice-card', '.accounts-page-heading',
    '.accounts-page-intro', '.account-status-filters', '.account-grid',
    '.account-card', '.account-detail-main > .eyebrow', '.account-detail-card'
  ].join(',');

  function initScrollReveal() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

    const prepare = node => {
      if (!node || node.nodeType !== 1) return;
      if (node.matches(revealSelector) && !node.classList.contains('dream-reveal')) {
        node.classList.add('dream-reveal');
        observer.observe(node);
      }
      node.querySelectorAll(revealSelector).forEach(element => {
        if (element.classList.contains('dream-reveal')) return;
        element.classList.add('dream-reveal');
        observer.observe(element);
      });
    };

    document.documentElement.classList.add('dream-motion-ready');
    prepare(document.body);
    const mutationObserver = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(prepare));
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  function initHeroParallax() {
    if (reduceMotion || !window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const hero = document.querySelector('.hero');
    if (!hero) return;
    let frame = 0;
    hero.addEventListener('pointermove', event => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = hero.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 2;
        const y = ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 2;
        hero.querySelectorAll('.hero-float,.hero-flower').forEach((element, index) => {
          const depth = 2 + (index % 3) * 2;
          element.style.setProperty('--hero-pointer-x', (x * depth).toFixed(1) + 'px');
          element.style.setProperty('--hero-pointer-y', (y * depth).toFixed(1) + 'px');
        });
      });
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      hero.querySelectorAll('.hero-float,.hero-flower').forEach(element => {
        element.style.setProperty('--hero-pointer-x', '0px');
        element.style.setProperty('--hero-pointer-y', '0px');
      });
    }, { passive: true });
  }

  function init() {
    initScrollReveal();
    initHeroParallax();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
