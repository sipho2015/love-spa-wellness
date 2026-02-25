(() => {
  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const siteNav = document.querySelector('.site-nav');
  const searchBtn = document.querySelector('.search-btn');
  const subscribeForm = document.querySelector('.subscribe-form');
  const yearEl = document.getElementById('year');

  const applyHeaderState = () => {
    if (!header) return;
    if (window.scrollY > 8) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  applyHeaderState();
  window.addEventListener('scroll', applyHeaderState, { passive: true });

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  if (menuToggle && siteNav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = siteNav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });

    siteNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        siteNav.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      window.alert('Search experience can be connected to your booking catalog.');
    });
  }

  if (subscribeForm) {
    subscribeForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = subscribeForm.querySelector('input[type="email"]');
      if (!input || !input.value.trim()) {
        window.alert('Please enter your email address.');
        return;
      }

      input.value = '';
      window.alert('Thank you for subscribing to Love Spa & Wellness updates.');
    });
  }
})();
