(() => {
  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const siteNav = document.querySelector('.site-nav');
  const searchBtn = document.querySelector('.search-btn');
  const subscribeForm = document.querySelector('.subscribe-form');
  const yearEl = document.getElementById('year');
  const businessNameEl = document.getElementById('business-name');
  const supportEmailLink = document.getElementById('support-email-link');
  const supportPhoneLink = document.getElementById('support-phone-link');
  const supportWhatsAppLink = document.getElementById('support-whatsapp-link');
  const businessAddressEl = document.getElementById('business-address');
  const openingHoursList = document.getElementById('opening-hours-list');

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

  const loadSiteProfile = async () => {
    try {
      const response = await fetch('/api/public/site-profile');
      if (!response.ok) {
        return;
      }

      const profile = await response.json();

      if (businessNameEl && profile.businessName) {
        businessNameEl.textContent = profile.businessName;
      }

      if (supportEmailLink && profile.supportEmail) {
        supportEmailLink.href = `mailto:${profile.supportEmail}`;
        supportEmailLink.textContent = profile.supportEmail;
      }

      if (supportPhoneLink && profile.phoneDial && profile.phoneDisplay) {
        supportPhoneLink.href = `tel:${profile.phoneDial}`;
        supportPhoneLink.textContent = profile.phoneDisplay;
      }

      if (supportWhatsAppLink && profile.whatsAppUrl) {
        supportWhatsAppLink.href = `${profile.whatsAppUrl}?text=Hello%20Love%20Spa%20%26%20Wellness`;
      }

      if (businessAddressEl && profile.address) {
        businessAddressEl.textContent = profile.address;
      }

      if (openingHoursList && Array.isArray(profile.openingHours) && profile.openingHours.length > 0) {
        openingHoursList.innerHTML = profile.openingHours
          .map((hour) => `<li><span>&#10022;</span> ${hour}</li>`)
          .join('');
      }
    } catch {
      // Keep static fallback values when backend is unreachable.
    }
  };

  void loadSiteProfile();

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
