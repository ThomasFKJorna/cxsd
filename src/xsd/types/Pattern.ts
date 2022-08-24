// This file is part of cxsd, copyright (c) 2022 Thomas F. K. Jorna
// Released under the MIT license, see LICENSE.

import { State } from '../State'
import * as types from '../types'

/** <xsd:enumeration> */
function escapeRegExp(string: string) {
  return string.replace(/\//g, '\\$&') // $& means the whole matched string
}

export class Pattern extends types.Base {
  static mayContain: () => types.BaseClass[] = () => [types.Annotation]

  init(state: State) {
    var parent = state.parent.xsdElement

    if (parent instanceof types.Restriction) {
      const escapedValue = escapeRegExp(this.value)
      parent.addPattern(escapedValue)
    }
  }

  value: string = null
}
