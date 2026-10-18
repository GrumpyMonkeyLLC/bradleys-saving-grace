// hCaptcha widget helper.
// Replace this with the site key from your hCaptcha dashboard (https://dashboard.hcaptcha.com).
// The value below is hCaptcha's public test key: it always passes and shows a "testing only" notice.
export const HCAPTCHA_SITEKEY = '10000000-ffff-ffff-ffff-000000000001'

let loading
function loadHcaptcha() {
  if (window.hcaptcha) return Promise.resolve(window.hcaptcha)
  loading ||= new Promise((resolve, reject) => {
    window.__onHcaptchaLoad = () => resolve(window.hcaptcha)
    const s = document.createElement('script')
    s.src = 'https://js.hcaptcha.com/1/api.js?render=explicit&onload=__onHcaptchaLoad&recaptchacompat=off'
    s.async = true
    s.onerror = () => { loading = null; reject(new Error('Could not load captcha')) }
    document.head.appendChild(s)
  })
  return loading
}

// Render a captcha into `el`. Use { invisible: true } for small forms:
// it only shows a challenge when hCaptcha thinks it's needed.
export function mountCaptcha(el, { invisible = false } = {}) {
  let widgetId = null
  const ready = loadHcaptcha().then(h => {
    widgetId = h.render(el, { sitekey: HCAPTCHA_SITEKEY, size: invisible ? 'invisible' : 'normal' })
  }).catch(() => {
    el.textContent = 'The captcha could not load. Please refresh the page.'
  })

  return {
    // Returns a token, or '' if the visitor hasn't completed the captcha
    async token() {
      await ready
      if (widgetId === null) return ''
      if (!invisible) return window.hcaptcha.getResponse(widgetId)
      try {
        const { response } = await window.hcaptcha.execute(widgetId, { async: true })
        return response
      } catch { return '' }
    },
    reset() {
      if (widgetId !== null) window.hcaptcha.reset(widgetId)
    },
  }
}
