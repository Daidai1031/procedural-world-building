// Sections fade in as they enter the viewport; the header marks the section being read.

const root = document.documentElement
root.classList.add('js')

const reveal = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue
    entry.target.classList.add('is-in')
    reveal.unobserve(entry.target)
  }
}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
document.querySelectorAll('[data-reveal]').forEach(element => reveal.observe(element))

const railNav = document.querySelector('.rail-nav')
const links = new Map([...document.querySelectorAll('.rail-nav a')].map(link => [link.hash.slice(1), link]))
const current = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue
    links.forEach((link, id) => link.toggleAttribute('aria-current', id === entry.target.id))
    // The Residents section is dark; the rail switches to light ink to stay visible on it.
    railNav?.classList.toggle('is-on-dark', entry.target.id === 'residents')
  }
}, { rootMargin: '-45% 0px -50% 0px' })
document.querySelectorAll('main > section[id]').forEach(section => current.observe(section))

const header = document.querySelector('.site-header')
const onScroll = () => header?.classList.toggle('is-scrolled', scrollY > 8)
addEventListener('scroll', onScroll, { passive: true })
onScroll()
