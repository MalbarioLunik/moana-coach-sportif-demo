/* Moana Coach Sportif — interactions (sans dépendance) */
(function () {
  'use strict';

  var PHONE_WA = '262692431357'; // numéro au format international, sans + ni espaces
  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Lien WhatsApp avec message pré-rempli ---------- */
  var waGreeting = 'Bonjour Moana, je viens de ton site et j’aimerais réserver ma séance test offerte.';
  document.querySelectorAll('[data-wa]').forEach(function (a) {
    a.href = 'https://wa.me/' + PHONE_WA + '?text=' + encodeURIComponent(waGreeting);
  });

  /* ---------- En-tête au scroll ---------- */
  var header = document.getElementById('site-header');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      header.classList.toggle('is-scrolled', window.scrollY > 20);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

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
  if (hasIO && !reduceMotion) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); revealIO.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { revealIO.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

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
    }
    var raf = 0;
    track.addEventListener('scroll', function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    }, { passive: true });
    update();
  });

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
  var hero = document.getElementById('hero');
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

    function validate() {
      var ok = true;
      var goal = form.querySelector('input[name="goal"]:checked');
      nameField.classList.toggle('has-error', !nameInput.value.trim());
      goalField.classList.toggle('has-error', !goal);
      if (!nameInput.value.trim()) { ok = false; nameInput.focus(); }
      else if (!goal) { ok = false; form.querySelector('input[name="goal"]').focus(); }
      return ok;
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
    });
  }
})();
