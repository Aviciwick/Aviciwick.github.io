document.addEventListener('DOMContentLoaded', () => {
  // 1. Header scroll effect
  const header = document.querySelector('.site-header');
  const handleScroll = () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // 1b. Hero scroll parallax & smooth exit transition
  const heroGrid = document.querySelector('.hero-grid');
  const heroScrollHint = document.getElementById('heroScrollHint');
  const heroSection = document.getElementById('hero');

  if (heroGrid && heroSection) {
    let heroTicking = false;
    const updateHeroTransition = () => {
      const scrollY = window.scrollY;
      const heroHeight = heroSection.offsetHeight || window.innerHeight;

      if (window.innerWidth > 992) {
        // Calculate scroll progress through hero
        const progress = Math.min(Math.max(scrollY / (heroHeight * 0.75), 0), 1);
        
        // Gentle parallax upward drift (max 50px)
        const translateY = Math.min(scrollY * 0.16, 50);
        // Smooth fade out
        const opacity = Math.max(1 - progress * 1.15, 0);

        heroGrid.style.transform = `translate3d(0, -${translateY}px, 0)`;
        heroGrid.style.opacity = opacity;

        if (heroScrollHint) {
          // Fade scroll hint quickly within the first 110px of scrolling
          const hintOpacity = Math.max(1 - scrollY / 110, 0);
          heroScrollHint.style.opacity = hintOpacity;
          heroScrollHint.style.pointerEvents = hintOpacity <= 0.05 ? 'none' : 'auto';
        }
      } else {
        heroGrid.style.transform = '';
        heroGrid.style.opacity = '';
        if (heroScrollHint) {
          heroScrollHint.style.opacity = '';
          heroScrollHint.style.pointerEvents = 'auto';
        }
      }
      heroTicking = false;
    };

    window.addEventListener('scroll', () => {
      if (!heroTicking) {
        window.requestAnimationFrame(updateHeroTransition);
        heroTicking = true;
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (!heroTicking) {
        window.requestAnimationFrame(updateHeroTransition);
        heroTicking = true;
      }
    }, { passive: true });

    updateHeroTransition();
  }

  // 1c. One-Gesture Screen Snap between Hero and Work
  const workSection = document.getElementById('work');

  let isSnapping = false;
  let snapAnimId = null;

  const getWorkTargetY = () => {
    if (!workSection) return window.innerHeight;
    const rect = workSection.getBoundingClientRect();
    return Math.round(rect.top + window.scrollY - 72);
  };

  const smoothSnapTo = (targetY, duration = 650, onDone) => {
    if (snapAnimId) {
      cancelAnimationFrame(snapAnimId);
    }
    isSnapping = true;

    // Temporarily disable CSS scroll-behavior so RAF frame updates aren't smoothed twice
    const prevScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';

    const startY = window.scrollY;
    const distance = targetY - startY;

    if (Math.abs(distance) < 2) {
      window.scrollTo(0, targetY);
      document.documentElement.style.scrollBehavior = prevScrollBehavior;
      isSnapping = false;
      if (onDone) onDone();
      return;
    }

    const startTime = performance.now();

    // Silky quartic ease-in-out curve
    const easeInOutQuart = (t) => {
      return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    };

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOutQuart(progress);

      window.scrollTo(0, startY + distance * ease);

      if (progress < 1) {
        snapAnimId = requestAnimationFrame(step);
      } else {
        window.scrollTo(0, targetY);
        snapAnimId = null;
        document.documentElement.style.scrollBehavior = prevScrollBehavior;
        // Buffer cooldown to swallow leftover trackpad/wheel momentum
        setTimeout(() => {
          isSnapping = false;
          if (onDone) onDone();
        }, 120);
      }
    };

    snapAnimId = requestAnimationFrame(step);
  };

  // Intercept wheel events to provide one-swipe full snap between Hero and Work
  window.addEventListener('wheel', (e) => {
    if (isSnapping) {
      e.preventDefault();
      return;
    }

    const targetY = getWorkTargetY();
    const currentY = window.scrollY;

    // Filter out micro-jitters
    if (Math.abs(e.deltaY) < 4) return;

    // Case 1: Anywhere on Hero -> scroll down glides straight to Work
    if (e.deltaY > 0 && currentY < targetY - 30) {
      e.preventDefault();
      smoothSnapTo(targetY, 650);
      return;
    }

    // Case 2: At top of Work -> scroll up glides back up to Hero
    if (e.deltaY < 0 && currentY >= targetY - 15 && currentY <= targetY + 40) {
      e.preventDefault();
      smoothSnapTo(0, 650);
      return;
    }

    // Case 3: In the middle gap (e.g. if scrollbar was dragged partway)
    if (currentY > 10 && currentY < targetY - 30) {
      e.preventDefault();
      if (e.deltaY > 0) {
        smoothSnapTo(targetY, 650);
      } else {
        smoothSnapTo(0, 650);
      }
      return;
    }

    // Deeper down in projects, normal scrolling is 100% active and untouched!
  }, { passive: false });

  // Touch gesture support for mobile / tablets
  let touchStartY = 0;
  let touchStartX = 0;

  window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (isSnapping) {
      e.preventDefault();
      return;
    }
    if (e.touches.length !== 1) return;

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const diffY = touchStartY - currentY; // positive = swipe up = scroll down
    const diffX = touchStartX - currentX;

    if (Math.abs(diffX) > Math.abs(diffY)) return; // Ignore horizontal swipes

    const targetY = getWorkTargetY();
    const currentScroll = window.scrollY;

    // Swipe down from Hero
    if (diffY > 30 && currentScroll < targetY - 30) {
      e.preventDefault();
      smoothSnapTo(targetY, 650);
    }
    // Swipe up from top of Work
    else if (diffY < -30 && currentScroll >= targetY - 15 && currentScroll <= targetY + 40) {
      e.preventDefault();
      smoothSnapTo(0, 650);
    }
  }, { passive: false });

  // Keyboard navigation for arrow down / page down on Hero
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    if (isSnapping) {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(e.key)) {
        e.preventDefault();
        return;
      }
    }

    const targetY = getWorkTargetY();
    const currentScroll = window.scrollY;

    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
      if (currentScroll < targetY - 30) {
        e.preventDefault();
        smoothSnapTo(targetY, 650);
      }
    } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
      if (currentScroll >= targetY - 15 && currentScroll <= targetY + 40) {
        e.preventDefault();
        smoothSnapTo(0, 650);
      }
    }
  });

  // Smooth navigation for all links pointing to #work
  document.querySelectorAll('a[href="#work"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      smoothSnapTo(getWorkTargetY(), 650);
    });
  });

  // 2. Mobile Nav Toggle
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', !expanded);
      siteNav.classList.toggle('open');
    });

    siteNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        siteNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // 3. Reveal on scroll animation
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    reveals.forEach(el => observer.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('active'));
  }

  // 4. Single-playing video policy (Pause others when one starts playing)
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    video.addEventListener('play', () => {
      videos.forEach(otherVideo => {
        if (otherVideo !== video && !otherVideo.paused) {
          otherVideo.pause();
        }
      });
    });

    // Update duration tag once loaded
    video.addEventListener('loadedmetadata', () => {
      const frame = video.closest('.video-frame');
      if (frame) {
        const badge = frame.querySelector('.video-duration');
        if (badge && !badge.dataset.custom) {
          const m = Math.floor(video.duration / 60);
          const s = Math.floor(video.duration % 60).toString().padStart(2, '0');
          badge.textContent = `${m}:${s}`;
        }
      }
    });
  });

  // 5. Active Nav Section Spy (Tracks work, research, skills, about)
  const trackedNavIds = ['work', 'research', 'skills', 'about'];
  const navLinks = document.querySelectorAll('.site-nav a[href^="#"]');

  const updateActiveNav = () => {
    let current = '';
    const scrollPos = window.scrollY + 160;
    const isAtBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 60);

    if (isAtBottom) {
      current = 'about';
    } else {
      trackedNavIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            current = id;
          }
        }
      });
    }

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (current && link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  };

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();

  // 6. Smooth Back to Top
  document.querySelectorAll('a[href="#top"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      smoothSnapTo(0, 650);
    });
  });

  // 7. Dynamic current year in footer
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
});
