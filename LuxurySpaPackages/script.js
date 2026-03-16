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
      const packagesSection = document.getElementById('packages');
      if (packagesSection) {
        packagesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  if (subscribeForm) {
    const statusEl = document.createElement('p');
    statusEl.className = 'state-message';
    statusEl.style.marginTop = '10px';
    statusEl.style.display = 'none';
    subscribeForm.appendChild(statusEl);

    const showStatus = (message, isError = false) => {
      statusEl.textContent = message;
      statusEl.className = isError ? 'state-message state-message--error' : 'state-message';
      statusEl.style.display = 'block';
    };

    subscribeForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const input = subscribeForm.querySelector('input[type="email"]');
      if (!input || !input.value.trim()) {
        showStatus('Please enter your email address.', true);
        return;
      }

      const email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showStatus('Please enter a valid email address.', true);
        return;
      }

      try {
        const response = await fetch('/api/inquiries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fullName: 'Website Newsletter Subscriber',
            email,
            phone: null,
            message: 'Please subscribe this email to Love Spa & Wellness updates.'
          })
        });

        if (!response.ok) {
          throw new Error('Subscription failed');
        }

        input.value = '';
        showStatus('Subscription request sent. We will keep you updated.');
      } catch (error) {
        showStatus('Unable to submit right now. Please try again shortly.', true);
      }
    });
  }
})();
