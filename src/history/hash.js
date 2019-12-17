/* @flow */

import type Router from '../index'
import { History } from './base'
import { cleanPath } from '../util/path'
import { getLocation } from './html5'
import { setupScroll, handleScroll } from '../util/scroll'
import { pushState, replaceState, supportsPushState } from '../util/push-state'

export class HashHistory extends History {
  constructor (router: Router, base: ?string, fallback: boolean) {
    super(router, base)
    // check history fallback deeplinking
    if (fallback && checkFallback(this.base)) {
      return
    }
    ensureSlash()
  }

  // this is delayed until the app mounts
  // to avoid the hashchange listener being fired too early
  setupListeners () {
    const router = this.router
    const expectScroll = router.options.scrollBehavior
    const supportsScroll = supportsPushState && expectScroll

    if (supportsScroll) {
      setupScroll()
    }

    window.addEventListener(supportsPushState ? 'popstate' : 'hashchange', () => {
      const current = this.current
      if (!ensureSlash()) {
        return
      }
      let locations = [getHash()]
      if (window.history && window.history.state && typeof window.history.state.state === 'object') {
        locations = window.history.state.state
      }
      this.transitionTo(locations, route => {
        if (supportsScroll) {
          handleScroll(this.router, route, current, true)
        }
        if (!supportsPushState) {
          replaceHash(route.fullPath)
        }
      })
    })
  }

  navigateAllLayers (locations: Array<RawLocation>, push: boolean, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(locations, routes => {
      const route = this.current[this.current.length - 1]
      pushHash(route.fullPath)
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    }, onAbort)
  }

  navigateLastLayer (location: RawLocation, push: boolean, onComplete?: Function, onAbort?: Function) {
    const locations = [
      ...this.current.slice(0, -1).map(r => r.fullPath),
      location
    ]
    this.navigateAllLayers(locations, push, onComplete, onAbort)
  }

  navigateLayer (layer: number, location: RawLocation, push: boolean, onComplete?: Function, onAbort?: Function) {
    const locations = [
      ...this.current.slice(0, layer).map(r => r.fullPath),
      location,
      ...this.current.slice(layer + 1).map(r => r.fullPath)
    ]
    this.navigateAllLayers(locations, push, onComplete, onAbort)
  }

  navigateAddLayer (location: RawLocation, push: boolean, onComplete?: Function, onAbort?: Function) {
    const locations = [
      ...this.current.map(r => r.fullPath),
      location
    ]
    this.navigateAllLayers(locations, push, onComplete, onAbort)
  }

  navigateRemoveLayer (location: RawLocation, push: boolean, onComplete?: Function, onAbort?: Function) {
    const locations = this.current.slice(0, -1).map(r => r.fullPath)
    this.navigateAllLayers(locations, push, onComplete, onAbort)
  }

  go (n: number) {
    window.history.go(n)
  }

  ensureURL (push?: boolean) {
    const route = this.current[this.current.length - 1]
    if (getHash() !== route.fullPath) {
      const path = cleanPath(this.base + route.fullPath)
      pushState(path, this.current.map(r => r.fullPath), !push)
    }
  }

  getCurrentLocation () {
    return getHash()
  }
}

function checkFallback (base) {
  const location = getLocation(base)
  if (!/^\/#/.test(location)) {
    window.location.replace(
      cleanPath(base + '/#' + location)
    )
    return true
  }
}

function ensureSlash (): boolean {
  const path = getHash()
  if (path.charAt(0) === '/') {
    return true
  }
  replaceHash('/' + path)
  return false
}

export function getHash (): string {
  // We can't use window.location.hash here because it's not
  // consistent across browsers - Firefox will pre-decode it!
  let href = window.location.href
  const index = href.indexOf('#')
  // empty path
  if (index < 0) return ''

  href = href.slice(index + 1)
  // decode the hash but not the search or hash
  // as search(query) is already decoded
  // https://github.com/vuejs/vue-router/issues/2708
  const searchIndex = href.indexOf('?')
  if (searchIndex < 0) {
    const hashIndex = href.indexOf('#')
    if (hashIndex > -1) href = decodeURI(href.slice(0, hashIndex)) + href.slice(hashIndex)
    else href = decodeURI(href)
  } else {
    if (searchIndex > -1) href = decodeURI(href.slice(0, searchIndex)) + href.slice(searchIndex)
  }

  return href
}

function getUrl (path) {
  const href = window.location.href
  const i = href.indexOf('#')
  const base = i >= 0 ? href.slice(0, i) : href
  return `${base}#${path}`
}

function pushHash (path) {
  if (supportsPushState) {
    pushState(getUrl(path))
  } else {
    window.location.hash = path
  }
}

function replaceHash (path) {
  if (supportsPushState) {
    replaceState(getUrl(path))
  } else {
    window.location.replace(getUrl(path))
  }
}
