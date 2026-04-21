// Shared navigation and footer injected into every page
export function renderNav(activePage = '') {
  const links = [
    { href: '/index.html',    label: 'Home' },
    { href: '/listings.html', label: 'Lost Dogs' },
    { href: '/report.html',   label: 'Report a Dog' },
    { href: '/partners.html', label: 'Partners' },
    { href: '/contact.html',  label: 'Contact' },
  ]
  const navLinks = links.map(l =>
    `<li><a href="${l.href}" ${activePage === l.label ? 'style="color:var(--gold-light);"' : ''}>${l.label}</a></li>`
  ).join('')

  document.getElementById('site-nav').innerHTML = `
    <nav class="site-nav">
      <div class="site-nav__inner">
        <a href="/index.html" class="site-nav__logo">
          Bradley's Hugs
          <span>🐾 Nonprofit Organization</span>
        </a>
        <ul class="site-nav__links" id="nav-links">
          ${navLinks}
          <li><a href="/report.html" class="nav-cta">Report Lost Dog</a></li>
        </ul>
        <button class="nav-hamburger" id="nav-hamburger" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>
      </div>
      <div class="nav-mobile-menu" id="nav-mobile-menu">
        <ul>
          ${navLinks}
          <li><a href="/report.html" class="nav-cta-mobile">Report Lost Dog</a></li>
        </ul>
      </div>
    </nav>
  `

  // Wire up hamburger AFTER innerHTML is set — scripts in innerHTML don't execute
  const hamburger = document.getElementById('nav-hamburger')
  const mobileMenu = document.getElementById('nav-mobile-menu')

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open')
    mobileMenu.classList.toggle('open')
  })

  document.querySelectorAll('.nav-mobile-menu a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open')
      mobileMenu.classList.remove('open')
    })
  })
}

export function renderFooter() {
  document.getElementById('site-footer').innerHTML = `
    <footer class="site-footer">
      <div class="site-footer__logo">Bradley's Hugs</div>
      <p>A nonprofit organization in formation · In loving memory of Bradley 🐾</p>
      <div class="site-footer__divider"></div>
      <nav class="site-footer__links">
        <a href="/index.html">Home</a>
        <a href="/listings.html">Lost Dogs</a>
        <a href="/report.html">Report a Dog</a>
        <a href="/contact.html">Contact</a>
        <a href="/partners.html">Partners</a>
        <a href="https://www.facebook.com/profile.php?id=61586951067313" target="_blank">Facebook</a>
      </nav>
      <p>© ${new Date().getFullYear()} Bradley's Hugs · All rights reserved</p>
      <p style="margin-top:0.5rem; font-size:0.82rem; opacity:0.4;">
        Built with love for every dog still waiting to come home.
      </p>
      <p style="margin-top:0.6rem; font-size:0.82rem; opacity:0.4;">
        Built by <a href="https://www.packetpointtechnologies.com" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;text-underline-offset:2px;">Packet Point Technologies LLC</a>
      </p>
    </footer>
  `
}
