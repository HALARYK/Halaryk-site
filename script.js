const topbar = document.querySelector('.topbar');
const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
const navLinks = [...document.querySelectorAll('.nav a')];
const revealItems = document.querySelectorAll('.reveal');

function updateTopbar() {
  topbar.classList.toggle('scrolled', window.scrollY > 24);
}
updateTopbar();
window.addEventListener('scroll', updateTopbar, { passive: true });

menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});

navLinks.forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealItems.forEach(el => revealObserver.observe(el));

const sections = [...document.querySelectorAll('main section[id]')];
const sectionObserver = new IntersectionObserver((entries) => {
  const visible = entries
    .filter(entry => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

  if (!visible) return;
  navLinks.forEach(link => {
    const target = link.getAttribute('href')?.slice(1);
    link.classList.toggle('active', target === visible.target.id);
  });
}, { rootMargin: '-30% 0px -55% 0px', threshold: [0, .15, .4, .75] });

sections.forEach(section => sectionObserver.observe(section));

document.querySelectorAll('[data-placeholder="true"]').forEach(link => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
  });
});
