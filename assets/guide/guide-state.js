





(function () {
  try {
    if (localStorage.getItem('guide-sidebar') === 'closed' && window.matchMedia('(min-width: 761px)').matches) {
      document.documentElement.classList.add('g-sidebar-closed');
    }
  } catch (e) {

  }
})();
