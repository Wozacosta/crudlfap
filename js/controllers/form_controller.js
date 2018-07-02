import Cookie from 'js-cookie'
import { Controller } from 'stimulus'
import M from 'materialize-css'
import init from '../init.js'

var loader = `<div class="preloader-wrapper small active">
  <div class="spinner-layer spinner-red-only">
    <div class="circle-clipper left">
      <div class="circle"></div>
    </div><div class="gap-patch">
      <div class="circle"></div>
    </div><div class="circle-clipper right">
      <div class="circle"></div>
    </div>
  </div>
</div>`


export default class extends Controller {
  get buttons() {
    return this.element.querySelectorAll('[type=submit]')
  }

  enable() {
    for (let e of this.buttons) {
      e.removeAttribute('disabled', '')
      e.innerHTML = e.getAttribute('data-initial')
    }
  }

  disable() {
    for (let e of this.buttons) {
      e.setAttribute('disabled', true)
      if (!e.hasAttribute('data-initial')) {
        e.setAttribute('data-initial', e.innerHTML)
      }
      e.innerHTML = loader
    }
  }

  submit(e) {
    if (this.element.id === undefined) {
      // console.warn('Skipping ajax because form tag has no id attr')
      return
    }
    this.disable()
    e.preventDefault()

    var url = this.element.getAttribute('action')
    var formData = new FormData(this.element)

    var application = this.application
    fetch(url, {
      credentials: 'same-origin',
      body: formData,
      method: 'POST',
      headers: {
        'X-CSRFToken': Cookie.get('csrftoken'),
        'Cache-Control': 'no-cache',
      }
    }).then(res => {
      if (!res.ok) {
        M.toast({
          html: res.status + ' : ' + res.statusText,
          classes: 'red white-text',
          displayLength: 15000,
        })
        this.context.controller.enable()
        return
      }

      res.text().then(text => {
        var parser = new DOMParser()
        var doc = parser.parseFromString(text, 'text/html')
        var newForm = doc.getElementById(this.element.id)

        // In case we find the same form in the response, we refresh only the
        // form tag, this works both inside modal and in normal page view.
        var source, target, url, title
        if (newForm) {
          source = newForm
          target = this.element
        } else {
          source = doc.querySelector('body')
          target = document.querySelector('body')
          var canonical = doc.querySelector('link[rel=canonical]')
          if (canonical) {
            url = canonical.getAttribute('href')
          }
          title = doc.querySelector('title').innerHTML

          // we're going to replace the body, that means we close the modal
          // which will restore the browser scrollbars if any
          var modal = M.Modal.getInstance(document.getElementById('modal'))
          if (modal && modal.isOpen) {
            modal.close()
          }
        }

        /**
         * Tear down controller before removing HTML
         */
        application.controllers.forEach(function(controller) {
          if(target.contains(controller.element) && typeof controller.teardown === 'function') {
            controller.teardown()
          }
        })

        target.innerHTML = source.innerHTML

        init(target)

        if (url && url != window.location.href) {
          window.history.pushState({}, title, url)
        }

        this.context.controller.enable()
      })
    })
  }
}
