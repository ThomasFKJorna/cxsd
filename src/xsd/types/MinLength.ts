// This file is part of cxsd, copyright (c) 2022 Thomas F. K. Jorna
// Released under the MIT license, see LICENSE.

import { State } from '../State'
import * as types from '../types'

/** <xsd:enumeration> */

export class MinLength extends types.Base {
  static mayContain: () => types.BaseClass[] = () => [types.Annotation]

  init(state: State) {
    var parent = state.parent.xsdElement

    if (parent instanceof types.Restriction) {
      parent.addMinLength(this.value)
      console.log(parent)
    }
  }

  value: string = null
}
