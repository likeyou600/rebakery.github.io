(function() {
  /**
   * Icarus 夜间模式 by iMaeGoo
   * https://www.imaegoo.com/
   */ 
  var isNight = localStorage.getItem('night');
  var nightNav;

  function applyNight(value) {
      if (value.toString() === 'true') {
          document.body.classList.remove('light');
          document.body.classList.add('night');
      } else {
          document.body.classList.remove('night');
          document.body.classList.add('light');
      }

      window.dispatchEvent(new CustomEvent('rebakery:theme-change'));
  }

  function bindNightNav() {
      nightNav = document.getElementById('night-nav');
      if (!nightNav) {
          return false;
      }

      if (nightNav.dataset.rebakeryNightBound === 'true') {
          return true;
      }

      nightNav.dataset.rebakeryNightBound = 'true';
      nightNav.addEventListener('click', switchNight);
      return true;
  }

  function findNightNav() {
      if (!bindNightNav()) {
          setTimeout(findNightNav, 100);
      }
  }

  function switchNight(event) {
      if (event) {
          event.preventDefault();
      }

      isNight = !document.body.classList.contains('night');
      applyNight(isNight);
      localStorage.setItem('night', isNight);
  }

  if (isNight === null) {
      isNight = 'true';
      localStorage.setItem('night', isNight);
  }

  window.rebakerySwitchNight = switchNight;
  window.rebakeryApplyNight = applyNight;
  window.rebakeryBindNightNav = bindNightNav;

  findNightNav();
  applyNight(isNight);
}());
