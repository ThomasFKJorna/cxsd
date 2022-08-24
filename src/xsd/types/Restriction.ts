// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import { State } from '../State'
import { DerivationBase } from './DerivationBase'
import * as types from '../types'

/** <xsd:restriction>
 * The schema allows a restriction to contain anything, but we parse only some useful restrictions. */

export class Restriction extends DerivationBase {
  static mayContain: () => types.BaseClass[] = () =>
    DerivationBase.mayContain().concat([
      types.Enumeration,
      types.Pattern,
      types.MaxLength,
      types.MinLength,
      types.MaxInclusive,
      types.MinInclusive,
      types.TotalDigits,
    ])

  // TODO: Remove this.
  init(state: State) {
    this.parent = state.parent
  }

  //	TODO: uncomment this when resolve function dependencies are handled.
  resolve(state: State) {
    var parent = state.parent.xsdElement

    if (parent instanceof types.SimpleType) {
      parent.setEnumerationList(this.enumerationList)
    }
    if (parent instanceof types.SimpleType) {
      parent.setPattern(this.pattern)
    }

    super.resolve(state)
  }

  addEnumeration(content: string) {
    if (!this.enumerationList) {
      this.enumerationList = []

      // TODO: Remove this and uncomment the resolve function.
      var parent = this.parent.xsdElement

      if (parent instanceof types.SimpleType) {
        parent.setEnumerationList(this.enumerationList)
      }
    }
    this.enumerationList.push(content)
  }

  addPattern(content: string) {
    if (!this.pattern) {
      // this.enumerationList = []

      // TODO: Remove this and uncomment the resolve function.
      var parent = this.parent.xsdElement

      if (parent instanceof types.SimpleType) {
        parent.setPattern(content)
      }
    }
    this.pattern = content
  }
  addMaxLength(content: string) {
    if (!this.maxLength) {
      // this.enumerationList = []

      // TODO: Remove this and uncomment the resolve function.
      var parent = this.parent.xsdElement

      if (parent instanceof types.SimpleType) {
        parent.setMaxLength(content)
      }
    }
    this.maxLength = content
  }
  addMinLength(content: string) {
    if (!this.minLength) {
      // this.enumerationList = []

      // TODO: Remove this and uncomment the resolve function.
      var parent = this.parent.xsdElement

      if (parent instanceof types.SimpleType) {
        parent.setMinLength(content)
      }
    }
    this.minLength = content
  }
  addMaxInclusive(content: string) {
    if (!this.maxInclusive) {
      // this.enumerationList = []

      // TODO: Remove this and uncomment the resolve function.
      var parent = this.parent.xsdElement

      if (parent instanceof types.SimpleType) {
        parent.setMaxInclusive(content)
      }
    }
    this.maxInclusive = content
  }
  addTotalDigits(content: string) {
    if (!this.totalDigits) {
      // this.enumerationList = []

      // TODO: Remove this and uncomment the resolve function.
      var parent = this.parent.xsdElement

      if (parent instanceof types.SimpleType) {
        parent.setTotalDigits(content)
      }
    }
    this.totalDigits = content
  }
  addMinInclusive(content: string) {
    if (!this.minInclusive) {
      // this.enumerationList = []

      // TODO: Remove this and uncomment the resolve function.
      var parent = this.parent.xsdElement

      if (parent instanceof types.SimpleType) {
        parent.setMinInclusive(content)
      }
    }
    this.minInclusive = content
  }

  private parent: State // TODO: Remove this.
  private enumerationList: string[]
  private pattern: string
  private minLength: string
  private maxLength: string
  private minInclusive: string
  private maxInclusive: string
  private totalDigits: string
}
