/* ===================================================================
   motion.js — 스크롤 기반 등장 효과와 숫자 카운트업
   외부 라이브러리를 쓰지 않습니다. 브라우저 기본 기능만 사용합니다.

   사용법
     <div data-reveal>            화면에 들어오면 나타남
     <div data-reveal="stagger">  자식 요소가 순서대로 나타남
     <span data-count="140000" data-suffix="장">  0부터 세며 올라감

   접근성
     운영체제에 '동작 줄이기'가 켜져 있으면 모든 애니메이션을 끄고
     최종 상태를 즉시 보여줍니다.
   =================================================================== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -----------------------------------------------------------------
     1. 등장 효과
     IntersectionObserver는 "이 요소가 화면에 들어왔는가"를 브라우저가
     알려주는 기능입니다. 스크롤 이벤트를 직접 듣는 것보다 훨씬 가볍습니다.
     ----------------------------------------------------------------- */

  var revealTargets = document.querySelectorAll('[data-reveal]');

  // 요소 하나를 최종 상태로 만듭니다. 애니메이션 경로와 안전장치가 함께 씁니다.
  function show(el) {
    el.classList.add('is-visible');
    if (el.dataset.reveal === 'stagger') {
      Array.prototype.forEach.call(el.children, function (child) {
        child.classList.add('is-visible');
      });
    }
  }

  // 안전장치 — IntersectionObserver가 동작하지 않는 환경에서
  // 내용이 투명한 채로 남는 것을 막습니다.
  // 관찰이 정상이면 브라우저가 곧바로 첫 콜백을 주므로 이 타이머는 아무 일도 하지 않습니다.
  var observerAlive = false;

  setTimeout(function () {
    if (observerAlive) return;
    revealTargets.forEach(show);
    countTargets.forEach(settle);
  }, 4000);

  if (reduceMotion) {
    // 동작을 줄이는 설정이면 애니메이션 없이 바로 보여줍니다.
    observerAlive = true;
    revealTargets.forEach(show);
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      observerAlive = true;

      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var el = entry.target;
        el.classList.add('is-visible');

        // stagger 모드면 자식에게 순서대로 지연 시간을 줍니다.
        if (el.dataset.reveal === 'stagger') {
          Array.prototype.forEach.call(el.children, function (child, i) {
            child.style.transitionDelay = (i * 70) + 'ms';
            child.classList.add('is-visible');
          });
        }

        // 한 번 나타난 뒤에는 더 관찰하지 않습니다.
        revealObserver.unobserve(el);
      });
    }, {
      // 요소가 아래에서 15% 정도 올라왔을 때 시작합니다.
      rootMargin: '0px 0px -15% 0px',
      threshold: 0
    });

    revealTargets.forEach(function (el) { revealObserver.observe(el); });
  }

  /* -----------------------------------------------------------------
     2. 숫자 카운트업
     ----------------------------------------------------------------- */

  // 1,234 형태로 천 단위 구분 기호를 넣습니다.
  function format(value, decimals) {
    return value.toLocaleString('ko-KR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  // 처음엔 빠르게, 끝에서 부드럽게 감속합니다.
  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // 애니메이션 없이 최종 숫자를 바로 표시합니다.
  // 동작 줄이기 설정과 위 안전장치가 함께 씁니다.
  function settle(el) {
    var target = parseFloat(el.dataset.count);
    if (isNaN(target)) return;
    el.textContent = (el.dataset.prefix || '')
      + format(target, parseInt(el.dataset.decimals || '0', 10))
      + (el.dataset.suffix || '');
  }

  function runCount(el) {
    var target   = parseFloat(el.dataset.count);
    var decimals = parseInt(el.dataset.decimals || '0', 10);
    var prefix   = el.dataset.prefix || '';
    var suffix   = el.dataset.suffix || '';
    var duration = parseInt(el.dataset.duration || '1600', 10);

    if (isNaN(target)) return;

    if (reduceMotion) {
      el.textContent = prefix + format(target, decimals) + suffix;
      return;
    }

    var start = null;

    function step(timestamp) {
      if (start === null) start = timestamp;

      var progress = Math.min((timestamp - start) / duration, 1);
      var current  = target * easeOut(progress);

      el.textContent = prefix + format(current, decimals) + suffix;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // 마지막은 계산 오차 없이 정확한 값으로 고정합니다.
        el.textContent = prefix + format(target, decimals) + suffix;
      }
    }

    requestAnimationFrame(step);
  }

  var countTargets = document.querySelectorAll('[data-count]');

  var countObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      runCount(entry.target);
      countObserver.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  countTargets.forEach(function (el) {
    // 시작 전에는 0으로 표시해 두어야 값이 튀지 않습니다.
    if (!reduceMotion) {
      el.textContent = (el.dataset.prefix || '') + '0' + (el.dataset.suffix || '');
    }
    countObserver.observe(el);
  });

})();
