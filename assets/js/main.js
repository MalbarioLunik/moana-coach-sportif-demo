/* Moana Coach Sportif — interactions et animations (sans dépendance) */
(function () {
  'use strict';

  var PHONE_WA = '262692431357'; // numéro au format international, sans + ni espaces
  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var anim = !reduceMotion;
  if (anim) root.classList.add('anim');

  /* ---------- Titres découpés en mots (pour l'effet « mots qui montent ») ---------- */
  function splitWords(el) {
    if (!el) return;
    var i = 0;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.textContent.split(/([ \t\n\r]+)/).forEach(function (part) {
        if (!part) return;
        if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span');
        var inner = document.createElement('span');
        w.className = 'w';
        inner.textContent = part;
        inner.style.setProperty('--i', i++);
        w.appendChild(inner);
        frag.appendChild(w);
      });
      node.parentNode.replaceChild(frag, node);
    });
    el.classList.add('split');
  }
  var heroTitle = document.querySelector('.hero-title');
  if (anim) {
    splitWords(heroTitle);
    document.querySelectorAll('.section-head h2, .contact-text h2').forEach(splitWords);
  }

  /* ---------- Écran de chargement ---------- */
  function startHero() {
    root.classList.remove('is-loading');
    root.classList.add('is-loaded');
    setTimeout(function () { if (heroTitle) heroTitle.classList.add('is-revealed'); }, anim ? 1250 : 0);
  }

  var loader = document.getElementById('loader');
  if (loader) {
    root.classList.add('is-loading');
    var pctEl = document.getElementById('loader-pct');
    var seen = false;
    try { seen = sessionStorage.getItem('moana-loaded') === '1'; } catch (e) { /* stockage indisponible */ }
    var MIN = reduceMotion ? 150 : (seen ? 450 : 950); // durée minimale d'affichage
    var MAX = 4000;                                     // on n'attend jamais plus longtemps
    var t0 = Date.now(), shown = 0, from = 0, finishAt = 0, ready = false, done = false;

    var imgReady = function (src) {
      return new Promise(function (res) { var im = new Image(); im.onload = im.onerror = res; im.src = src; });
    };
    var waits = [imgReady('assets/img/poster-hero.webp'), imgReady('assets/img/logo-moana-360.webp')];
    if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
    Promise.all(waits).then(function () { ready = true; }, function () { ready = true; });

    // Progression calculée sur le temps écoulé : reste juste même si l'onglet est en arrière-plan
    var timer = setInterval(function () {
      var now = Date.now(), elapsed = now - t0;
      if (!finishAt && ((ready && elapsed >= MIN) || elapsed >= MAX)) { finishAt = now; from = shown; }
      shown = finishAt
        ? from + (100 - from) * Math.min(1, (now - finishAt) / 380)
        : 88 * (1 - Math.exp(-elapsed / (MIN * .55)));
      loader.style.setProperty('--p', (shown / 100).toFixed(3));
      pctEl.textContent = Math.round(shown);
      if (shown >= 100 && !done) {
        done = true;
        clearInterval(timer);
        loader.classList.add('is-full');
        try { sessionStorage.setItem('moana-loaded', '1'); } catch (e) { /* stockage indisponible */ }
        setTimeout(function () {
          loader.classList.add('is-done');
          startHero();
          setTimeout(function () { loader.remove(); }, 1100);
        }, reduceMotion ? 0 : 260);
      }
    }, 30);
  } else {
    startHero();
  }

  /* ---------- Lien WhatsApp avec message pré-rempli ---------- */
  var waGreeting = 'Bonjour Moana, je viens de ton site et j’aimerais réserver ma séance test offerte.';
  document.querySelectorAll('[data-wa]').forEach(function (a) {
    a.href = 'https://wa.me/' + PHONE_WA + '?text=' + encodeURIComponent(waGreeting);
  });

  /* ---------- Défilement : en-tête, barre de lecture, parallaxe, bandeau ---------- */
  var header = document.getElementById('site-header');
  var progressBar = document.getElementById('scroll-progress');
  var hero = document.getElementById('hero');
  var heroContent = document.querySelector('.hero-content');
  var heroMedia = document.querySelector('.hero-media');
  var heroFrame = document.querySelector('.hero-frame');
  var drifts = Array.prototype.slice.call(document.querySelectorAll('[data-drift]'));
  var ticker = document.querySelector('.ticker');
  var tickerTrack = document.querySelector('.ticker-track');
  var tickerAnim = anim && tickerTrack && tickerTrack.getAnimations ? tickerTrack.getAnimations()[0] : null;
  var lastY = window.scrollY, lastT = performance.now(), tickerRate = 1, tickerDir = 1, rafId = 0;

  function update() {
    rafId = 0;
    var y = window.scrollY, vh = window.innerHeight, now = performance.now();
    header.classList.toggle('is-scrolled', y > 20);
    var max = document.documentElement.scrollHeight - vh;
    if (progressBar) progressBar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ')';
    if (!anim) return;

    // Hero : le texte s'éloigne, la vidéo zoome légèrement
    var hh = hero.offsetHeight;
    if (y < hh) {
      var k = y / hh;
      heroContent.style.transform = 'translate3d(0,' + (y * .2).toFixed(1) + 'px,0)';
      heroContent.style.opacity = Math.max(0, 1 - k * 1.1).toFixed(3);
      if (heroMedia) heroMedia.style.transform = 'scale(' + (1 + k * .12).toFixed(4) + ')';
      if (heroFrame) heroFrame.style.transform = 'translate3d(0,' + (y * -.08).toFixed(1) + 'px,0)';
    }

    // Grands mots en filigrane qui glissent avec le défilement
    drifts.forEach(function (el) {
      var r = el.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var p = (vh - r.top) / (vh + r.height);
      el.style.transform = 'translate3d(' + ((.5 - p) * 40).toFixed(2) + '%,0,0)';
    });

    // Bandeau : accélère avec la vitesse de défilement et suit le sens
    var v = (y - lastY) / Math.max(16, now - lastT);
    if (Math.abs(v) > .05) tickerDir = v > 0 ? 1 : -1;
    var target = tickerDir * (1 + Math.min(Math.abs(v) * 2.5, 5));
    tickerRate += (target - tickerRate) * .12;
    if (tickerAnim) tickerAnim.playbackRate = tickerRate;
    if (ticker) ticker.style.setProperty('--sk', Math.max(-12, Math.min(12, (tickerRate - tickerDir) * -3)).toFixed(2) + 'deg');
    lastY = y; lastT = now;
    if (Math.abs(tickerRate - tickerDir) > .02) rafId = requestAnimationFrame(update); // retour en douceur
  }
  function onScroll() { if (!rafId) rafId = requestAnimationFrame(update); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();

  /* ---------- Braises qui montent ---------- */
  if (anim) {
    document.querySelectorAll('[data-embers]').forEach(function (box) {
      var n = parseInt(box.getAttribute('data-embers'), 10) || 10;
      if (window.innerWidth < 640) n = Math.round(n * .6);
      for (var i = 0; i < n; i++) {
        var e = document.createElement('i');
        e.style.cssText =
          '--x:' + (Math.random() * 100).toFixed(1) + '%;' +
          '--s:' + (3 + Math.random() * 6).toFixed(1) + 'px;' +
          '--t:' + (7 + Math.random() * 7).toFixed(1) + 's;' +
          '--dl:-' + (Math.random() * 14).toFixed(1) + 's;' +
          '--dx:' + ((Math.random() - .5) * 120).toFixed(0) + 'px;' +
          '--o:' + (.35 + Math.random() * .5).toFixed(2);
        box.appendChild(e);
      }
    });
  }

  /* ---------- Menu mobile ---------- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobile-menu');

  function focusables() {
    return Array.prototype.slice.call(menu.querySelectorAll('a, button')).concat(burger);
  }
  function openMenu() {
    menu.hidden = false;
    void menu.offsetWidth; // force le rendu avant la transition
    menu.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Fermer le menu');
    document.body.classList.add('menu-open');
    header.classList.add('is-scrolled');
    var first = menu.querySelector('a');
    if (first) first.focus({ preventScroll: true });
  }
  function closeMenu(restoreFocus) {
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Ouvrir le menu');
    document.body.classList.remove('menu-open');
    onScroll();
    setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 300);
    if (restoreFocus) burger.focus({ preventScroll: true });
  }
  burger.addEventListener('click', function () {
    burger.getAttribute('aria-expanded') === 'true' ? closeMenu(true) : openMenu();
  });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) closeMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (burger.getAttribute('aria-expanded') !== 'true') return;
    if (e.key === 'Escape') closeMenu(true);
    if (e.key === 'Tab') { // garde le focus dans le menu
      var items = focusables();
      var i = items.indexOf(document.activeElement);
      var next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === items.length - 1 ? 0 : i + 1);
      items[next].focus();
      e.preventDefault();
    }
  });
  window.matchMedia('(min-width: 960px)').addEventListener('change', function (mq) {
    if (mq.matches && burger.getAttribute('aria-expanded') === 'true') closeMenu(false);
  });

  /* ---------- Apparitions au scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (hasIO && anim) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); revealIO.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { revealIO.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Squelettes animés : retirés dès que la vignette est là ---------- */
  document.querySelectorAll('.goal-media, .testi-media, .hero-frame-inner').forEach(function (wrap) {
    var v = wrap.querySelector('video'), img = wrap.querySelector('img');
    var ready = function () { wrap.classList.add('is-ready'); };
    if (v && v.poster) {
      var im = new Image(); im.onload = im.onerror = ready; im.src = v.poster;
    } else if (img) {
      if (img.complete && img.naturalWidth) ready();
      else { img.addEventListener('load', ready); img.addEventListener('error', ready); }
    } else {
      ready();
    }
  });

  /* ---------- Vidéos : chargement différé + lecture seulement à l'écran ---------- */
  var videos = document.querySelectorAll('video[data-src]');
  var autoplay = !reduceMotion && !saveData;

  function load(v) {
    if (v.dataset.loaded) return;
    v.src = v.dataset.src;
    v.preload = 'auto';
    v.dataset.loaded = '1';
  }
  function play(v) {
    load(v);
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* lecture bloquée : l'affiche reste visible */ });
  }

  if (hasIO) {
    var nearIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { load(en.target); nearIO.unobserve(en.target); }
      });
    }, { rootMargin: '300px 0px' });

    var playIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting && autoplay && !v.dataset.userPaused) play(v);
        else if (!en.isIntersecting && !v.paused) v.pause();
      });
    }, { threshold: 0.35 });

    videos.forEach(function (v) {
      if (autoplay) nearIO.observe(v);
      playIO.observe(v);
    });
  } else if (autoplay) {
    videos.forEach(play);
  }

  // Toucher une vidéo : lecture / pause (utile si l'autoplay est désactivé)
  document.querySelectorAll('[data-video-wrap]').forEach(function (wrap) {
    var v = wrap.querySelector('video');
    if (!v) return;
    wrap.addEventListener('click', function (e) {
      if (e.target.closest('.sound-btn')) return;
      if (v.paused) { delete v.dataset.userPaused; play(v); }
      else { v.pause(); v.dataset.userPaused = '1'; }
    });
  });

  /* ---------- Son des vidéos d'avis ---------- */
  var soundBtns = document.querySelectorAll('.sound-btn');
  soundBtns.forEach(function (btn) {
    var v = btn.parentElement.querySelector('video');
    btn.addEventListener('click', function () {
      var on = btn.getAttribute('aria-pressed') !== 'true';
      soundBtns.forEach(function (other) { // un seul son à la fois
        if (other === btn) return;
        other.setAttribute('aria-pressed', 'false');
        other.setAttribute('aria-label', 'Activer le son de la vidéo');
        other.parentElement.querySelector('video').muted = true;
      });
      v.muted = !on;
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Couper le son de la vidéo' : 'Activer le son de la vidéo');
      if (on) { delete v.dataset.userPaused; v.currentTime = v.paused ? 0 : v.currentTime; play(v); }
    });
  });

  /* ---------- Carrousel des objectifs (mobile) ---------- */
  document.querySelectorAll('[data-carousel]').forEach(function (car) {
    var track = car.querySelector('[data-carousel-track]');
    var dotsWrap = car.querySelector('[data-carousel-dots]');
    var slides = Array.prototype.slice.call(track.children);
    var dots = slides.map(function (slide, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Objectif ' + (i + 1));
      b.addEventListener('click', function () {
        track.scrollTo({ left: slide.offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).scrollPaddingLeft || 0), behavior: reduceMotion ? 'auto' : 'smooth' });
      });
      dotsWrap.appendChild(b);
      return b;
    });
    function update() {
      var pad = parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0;
      var x = track.scrollLeft + pad;
      var idx = 0, best = Infinity;
      slides.forEach(function (s, i) {
        var d = Math.abs(s.offsetLeft - track.offsetLeft - x);
        if (d < best) { best = d; idx = i; }
      });
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) idx = slides.length - 1;
      dots.forEach(function (d, i) { d.setAttribute('aria-current', i === idx ? 'true' : 'false'); });
      slides.forEach(function (s, i) { s.classList.toggle('is-current', i === idx); });
    }
    var raf = 0;
    track.addEventListener('scroll', function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    }, { passive: true });
    update();
  });

  /* ---------- Ordinateur : cartes inclinables et boutons « aimantés » ---------- */
  if (anim && finePointer) {
    document.querySelectorAll('.goal').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        card.classList.add('is-tilting');
        card.style.transform = 'perspective(900px) rotateX(' + (-y * 8).toFixed(2) + 'deg) rotateY(' + (x * 10).toFixed(2) + 'deg) translateY(-6px)';
        card.style.setProperty('--mx', ((x + .5) * 100).toFixed(1) + '%');
        card.style.setProperty('--my', ((y + .5) * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilting');
        card.style.transform = '';
      });
    });
    document.querySelectorAll('.btn-primary.btn-lg, .header-cta, .wa-float').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.translate = ((e.clientX - r.left - r.width / 2) * .2).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * .3).toFixed(1) + 'px';
      });
      b.addEventListener('pointerleave', function () { b.style.translate = ''; });
    });
  }

  /* ---------- Navigation active (ordinateur) ---------- */
  var navLinks = document.querySelectorAll('.main-nav a');
  if (hasIO && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var link = byId[en.target.id];
        if (!link) return;
        if (en.isIntersecting) {
          navLinks.forEach(function (a) { a.classList.remove('is-active'); });
          link.classList.add('is-active');
        } else {
          link.classList.remove('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) navIO.observe(s);
    });
  }

  /* ---------- Barre d'actions mobile / bouton WhatsApp flottant ---------- */
  var actionBar = document.getElementById('action-bar');
  var waFloat = document.getElementById('wa-float');
  var contact = document.getElementById('contact-form');
  var pastHero = false, inContact = false;
  function refreshBars() {
    var show = pastHero && !inContact;
    actionBar.classList.toggle('is-visible', show);
    waFloat.classList.toggle('is-visible', show);
  }
  if (hasIO) {
    new IntersectionObserver(function (en) {
      pastHero = !en[0].isIntersecting; refreshBars();
    }, { rootMargin: '-40% 0px 0px 0px' }).observe(hero);
    new IntersectionObserver(function (en) {
      inContact = en[0].isIntersecting; refreshBars();
    }, { threshold: 0.15 }).observe(contact);
  } else {
    pastHero = true; refreshBars();
  }

  /* ---------- Formulaire -> WhatsApp ---------- */
  var form = document.getElementById('moana-contact-form');
  if (form) {
    var nameInput = form.querySelector('#cf-name');
    var nameField = nameInput.closest('.field');
    var goalField = form.querySelector('fieldset.field');
    var submitBtn = form.querySelector('button[type="submit"]');
    var submitLabel = submitBtn.innerHTML;

    function flagError(field, on) {
      field.classList.remove('has-error');
      if (on) { void field.offsetWidth; field.classList.add('has-error'); } // relance la secousse
    }
    function validate() {
      var goal = form.querySelector('input[name="goal"]:checked');
      var nameOk = !!nameInput.value.trim();
      flagError(nameField, !nameOk);
      flagError(goalField, !goal);
      if (!nameOk) { nameInput.focus(); return false; }
      if (!goal) { form.querySelector('input[name="goal"]').focus(); return false; }
      return true;
    }
    nameInput.addEventListener('input', function () { if (nameInput.value.trim()) nameField.classList.remove('has-error'); });
    form.querySelectorAll('input[name="goal"]').forEach(function (r) {
      r.addEventListener('change', function () { goalField.classList.remove('has-error'); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) return;
      var name = nameInput.value.trim();
      var goal = form.querySelector('input[name="goal"]:checked').value;
      var message = form.querySelector('#cf-message').value.trim();
      var text = 'Nouvelle demande depuis le site Moana :\n'
        + 'Prénom : ' + name + '\n'
        + 'Objectif : ' + goal + '\n'
        + 'Message : ' + (message || '-');
      window.open('https://wa.me/' + PHONE_WA + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      submitBtn.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>Ouverture de WhatsApp…';
      submitBtn.classList.add('is-sent');
      setTimeout(function () { submitBtn.innerHTML = submitLabel; submitBtn.classList.remove('is-sent'); }, 3000);
    });
  }
})();
