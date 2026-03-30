/* ============================================
   SCEAD Foundation India — Main Scripts
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ---------- Mobile Navigation ----------
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('active');
      document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // ---------- Back to Top Button ----------
  const backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 400);
    });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---------- Animated Counters ----------
  const counters = document.querySelectorAll('.stat-number');
  let countersStarted = false;

  function animateCounters() {
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target'));
      const suffix = counter.getAttribute('data-suffix') || '';
      const duration = 2000;
      const step = target / (duration / 16);
      let current = 0;

      const update = () => {
        current += step;
        if (current < target) {
          counter.textContent = Math.floor(current).toLocaleString() + suffix;
          requestAnimationFrame(update);
        } else {
          counter.textContent = target.toLocaleString() + suffix;
        }
      };
      update();
    });
  }

  // Intersection Observer for counters
  if (counters.length > 0) {
    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !countersStarted) {
            countersStarted = true;
            animateCounters();
          }
        });
      }, { threshold: 0.3 });
      observer.observe(statsSection);
    }
  }

  // ---------- Scroll Animations (lightweight AOS alternative) ----------
  const animateElements = document.querySelectorAll('[data-aos]');

  if (animateElements.length > 0) {
    const animateObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = entry.target.getAttribute('data-aos-delay') || 0;
          setTimeout(() => {
            entry.target.classList.add('aos-animate');
          }, parseInt(delay));
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    animateElements.forEach(el => {
      const type = el.getAttribute('data-aos');
      if (type === 'fade-up') {
        el.style.transform = 'translateY(30px)';
      } else if (type === 'fade-right') {
        el.style.transform = 'translateX(-30px)';
      } else if (type === 'fade-left') {
        el.style.transform = 'translateX(30px)';
      } else if (type === 'zoom-in') {
        el.style.transform = 'scale(0.95)';
      }
      el.style.transitionDuration = '0.6s';
      el.style.transitionTimingFunction = 'ease-out';

      animateObserver.observe(el);
    });
  }

  // Reset transform on animate
  const style = document.createElement('style');
  style.textContent = '[data-aos].aos-animate { transform: none !important; }';
  document.head.appendChild(style);

  // ---------- Active Nav Link ----------
  const sections = document.querySelectorAll('section[id]');
  if (sections.length > 0) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY + 100;
      sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        const link = document.querySelector(`.nav-links a[href="#${id}"]`);
        if (link) {
          if (scrollY >= top && scrollY < top + height) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        }
      });
    });
  }

  // ---------- Partners Infinite Scroll Clone ----------
  const track = document.querySelector('.partners-track');
  if (track) {
    const items = track.innerHTML;
    track.innerHTML = items + items;
  }

  // ---------- Form Validation ----------
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'Thank you! We\'ll be in touch.';
      btn.disabled = true;
      btn.style.opacity = '0.7';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
        form.reset();
      }, 3000);
    });
  });

  // ---------- Lazy Loading Images ----------
  const lazyImages = document.querySelectorAll('img[data-src]');
  if (lazyImages.length > 0) {
    const imgObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          imgObserver.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });

    lazyImages.forEach(img => imgObserver.observe(img));
  }

  // ---------- Show More / Load More for Project Cards ----------
  const projectsGrid = document.querySelector('.projects-grid');
  const loadMoreBtn = document.querySelector('.load-more-btn');
  if (projectsGrid && loadMoreBtn) {
    const allCards = projectsGrid.querySelectorAll('.project-card');
    const yearDividers = projectsGrid.querySelectorAll('.year-divider');
    const INITIAL_SHOW = 9;
    let showing = INITIAL_SHOW;

    // Hide cards beyond initial count
    function updateVisibility() {
      let cardIndex = 0;
      const children = projectsGrid.children;
      for (let i = 0; i < children.length; i++) {
        const el = children[i];
        if (el.classList.contains('year-divider')) {
          // Show year divider if any of its following cards are visible
          let hasVisibleCard = false;
          let next = el.nextElementSibling;
          while (next && !next.classList.contains('year-divider')) {
            if (next.classList.contains('project-card')) {
              const idx = Array.from(allCards).indexOf(next);
              if (idx < showing) hasVisibleCard = true;
            }
            next = next.nextElementSibling;
          }
          el.style.display = hasVisibleCard ? '' : 'none';
        } else if (el.classList.contains('project-card')) {
          el.style.display = cardIndex < showing ? '' : 'none';
          cardIndex++;
        }
      }
      if (showing >= allCards.length) {
        loadMoreBtn.style.display = 'none';
      } else {
        loadMoreBtn.textContent = `Show More (${allCards.length - showing} remaining)`;
      }
    }

    loadMoreBtn.addEventListener('click', () => {
      showing += 9;
      updateVisibility();
      // Re-trigger AOS for newly shown cards
      if (typeof AOS !== 'undefined') AOS.refresh();
    });

    if (allCards.length > INITIAL_SHOW) {
      updateVisibility();
    } else {
      loadMoreBtn.style.display = 'none';
    }
  }

});
