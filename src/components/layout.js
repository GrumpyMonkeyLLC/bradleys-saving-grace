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
    <style>
      .nav-hamburger {
        display: none;
        flex-direction: column;
        gap: 5px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
      }
      .nav-hamburger span {
        display: block;
        width: 24px;
        height: 2px;
        background: rgba(255,255,255,0.7);
        border-radius: 2px;
        transition: all 0.25s;
      }
      .nav-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
      .nav-hamburger.open span:nth-child(2) { opacity: 0; }
      .nav-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
      .nav-mobile-menu {
        display: none;
        background: var(--brown-dark);
        border-top: 1px solid rgba(255,255,255,0.08);
        padding: 0.75rem 0 1rem;
      }
      .nav-mobile-menu.open { display: block; }
      .nav-mobile-menu ul { list-style: none; padding: 0; margin: 0; }
      .nav-mobile-menu li a {
        display: block;
        padding: 0.75rem 1.5rem;
        color: rgba(255,255,255,0.7);
        text-decoration: none;
        font-size: 0.95rem;
        font-family: 'DM Sans', sans-serif;
        transition: color 0.2s, background 0.2s;
      }
      .nav-mobile-menu li a:hover { color: var(--gold-light); background: rgba(255,255,255,0.04); }
      .nav-cta-mobile {
        margin: 0.5rem 1.5rem 0 !important;
        display: inline-block !important;
        background: var(--gold) !important;
        color: var(--brown-dark) !important;
        padding: 0.6rem 1.5rem !important;
        border-radius: 50px;
        font-weight: 500;
      }
      @media (max-width: 768px) {
        .site-nav__links { display: none !important; }
        .nav-hamburger { display: flex; }
      }
    </style>
    <script>
      document.getElementById('nav-hamburger').addEventListener('click', function() {
        this.classList.toggle('open');
        document.getElementById('nav-mobile-menu').classList.toggle('open');
      });
      document.querySelectorAll('.nav-mobile-menu a').forEach(a => {
        a.addEventListener('click', () => {
          document.getElementById('nav-hamburger').classList.remove('open');
          document.getElementById('nav-mobile-menu').classList.remove('open');
        });
      });
    </script>
  `
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
