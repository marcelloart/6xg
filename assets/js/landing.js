'use strict';
const harvestT_landing_js=value=>typeof BaraI18n!=='undefined'?BaraI18n.t(value):value;
const navToggle=document.getElementById('navToggle'),nav=document.getElementById('siteNav');
navToggle.addEventListener('click',()=>{const open=navToggle.getAttribute('aria-expanded')!=='true';navToggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);});
nav.addEventListener('click',event=>{if(event.target.closest('a')){navToggle.setAttribute('aria-expanded','false');nav.classList.remove('is-open');}});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelectorAll('[data-start]').forEach(button=>button.addEventListener('click',()=>{
  if(window.BARA_SESSION?.authenticated)document.dispatchEvent(new Event('bara:game-open'));
  else document.dispatchEvent(new Event('bara:account-open'));
}));
window.addEventListener('bara:session',event=>document.querySelectorAll('[data-start]').forEach(button=>{button.textContent=event.detail.authenticated?harvestT_landing_js('Mainkan kebunmu ↗'):harvestT_landing_js('Daftar & mulai ↗');}));

// Motion is an enhancement: the page stays readable without JavaScript or observers.
(() => {
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const header = document.querySelector('.site-header');
  const toggle = document.getElementById('motionToggle');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ambient = [...document.querySelectorAll('[data-ambient]')];
  const reveals = [];
  let revealObserver;
  let ambientObserver;
  let frame = 0;
  let userPaused = false;
  let heroVisible = true;

  const groups = [
    '.facts > div', '.section-heading', '.world-image',
    '.feature-stack article', '.steps article', '.crop-intro',
    '.crop-card', '.crop-footnote', '.building-grid article',
    '.account-callout > :not(.callout-botanical)', '.faq details'
  ];
  groups.forEach(selector => document.querySelectorAll(selector).forEach((element, index) => {
    element.setAttribute('data-reveal', '');
    element.style.setProperty('--reveal-delay', `${Math.min(index % 5, 3) * 75}ms`);
    reveals.push(element);
  }));

  function updateScroll() {
    frame = 0;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
    if (preference.matches || userPaused || document.hidden || !heroVisible) return;
    const distance = Math.min(hero.offsetHeight, Math.max(0, -hero.getBoundingClientRect().top));
    hero.style.setProperty('--hero-drift', `${(distance * 0.09).toFixed(1)}px`);
  }

  function requestScroll() {
    if (!frame && !document.hidden) frame = window.requestAnimationFrame(updateScroll);
  }

  function syncPause() {
    root.classList.toggle('motion-suspended', userPaused || document.hidden);
    toggle.setAttribute('aria-pressed', String(userPaused));
    toggle.querySelector('.motion-toggle-label').textContent = userPaused ? harvestT_landing_js('Putar animasi') : harvestT_landing_js('Jeda animasi');
    if (document.hidden && frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
    requestScroll();
  }

  function syncPreference() {
    root.classList.toggle('motion-enabled', !preference.matches);
    toggle.hidden = preference.matches;
    if (preference.matches) {
      revealObserver?.disconnect();
      reveals.forEach(element => element.classList.add('is-revealed'));
      hero.style.removeProperty('--hero-drift');
    } else {
      reveals.forEach(element => {
        if (!element.classList.contains('is-revealed')) revealObserver?.observe(element);
      });
    }
    syncPause();
  }

  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    ambientObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        entry.target.classList.toggle('ambient-paused', !entry.isIntersecting);
        if (entry.target === hero) {
          heroVisible = entry.isIntersecting;
          if (heroVisible) requestScroll();
        }
      });
    });
    ambient.forEach(element => ambientObserver.observe(element));
  } else {
    reveals.forEach(element => element.classList.add('is-revealed'));
  }

  // Keyboard focus must never land on a card that is still visually hidden.
  document.addEventListener('focusin', event => {
    event.target.closest('[data-reveal]')?.classList.add('is-revealed');
  });
  toggle.addEventListener('click', () => {
    userPaused = !userPaused;
    syncPause();
  });
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll, { passive: true });
  document.addEventListener('visibilitychange', syncPause);
  if (preference.addEventListener) preference.addEventListener('change', syncPreference);
  else preference.addListener(syncPreference);
  syncPreference();
})();
