/* @flow */

import type Router from '../index'
import { History } from './base'
import { cleanPath } from '../util/path'
import { START } from '../util/route'
import { setupScroll, handleScroll } from '../util/scroll'
import { pushState, supportsPushState } from '../util/push-state'

export class HTML5History extends History {
  constructor (router: Router, base: ?string) {
    super(router, base)

    const expectScroll = router.options.scrollBehavior
    const supportsScroll = supportsPushState && expectScroll

    if (supportsScroll) {
      setupScroll()
    }

    const initLocation = getLocation(this.base)
    window.addEventListener('popstate', e => {
      const current = this.current

      // Avoiding first `popstate` event dispatched in some browsers but first
      // history route not updated since async guard at the same time.
      const location = getLocation(this.base)
      if (this.current === START && location === initLocation) {
        return
      }

      let locations = [location]
      if (window.history.state && window.history.state.state) {
        locations = window.history.state.state
      }
      this.transitionTo(locations, route => {
        if (supportsScroll) {
          handleScroll(router, route, current, true)
        }
      })
    })
  }

  go (n: number) {
    window.history.go(n)
  }

  navigateAllLayers (locations: Array<RawLocation>, push: boolean, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(locations, routes => {
      this.ensureURL(push)
      const route = this.current[this.current.length - 1]
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

  ensureURL (push?: boolean) {
    const route = this.current[this.current.length - 1]
    if (getLocation(this.base) !== route.fullPath) {
      const path = cleanPath(this.base + route.fullPath)
      pushState(path, this.current.map(r => r.fullPath), !push)
    }
  }

  getCurrentLocation (): string {
    return getLocation(this.base)
  }
}

export function getLocation (base: string): string {
  let path = decodeURI(window.location.pathname)
  if (base && path.indexOf(base) === 0) {
    path = path.slice(base.length)
  }
  return (path || '/') + window.location.search + window.location.hash
}
