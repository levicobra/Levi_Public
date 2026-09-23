/* Progressive enhancement. Links, content, and native FAQ disclosures work without JS. */
document.documentElement.classList.add('js');
const toggle = document.querySelector('.nav-toggle');
const navigation = document.getElementById('site-nav');
if (toggle && navigation) {
  toggle.hidden = false;
  const closeMenu = () => {
    navigation.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      toggle.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
  navigation.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', closeMenu);
}
const motionButton = document.querySelector('.motion-toggle');
if (motionButton) {
  motionButton.hidden = false;
  motionButton.addEventListener('click', () => {
    const paused = document.body.classList.toggle('motion-paused');
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.setAttribute('aria-label', paused ? 'Play illustration animation' : 'Pause illustration animation');
    motionButton.firstElementChild.textContent = paused ? '▶' : 'Ⅱ';
  });
}
