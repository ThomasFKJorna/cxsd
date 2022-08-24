// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import { State } from '../State'
import { QName } from '../QName'
import * as types from '../types'

/** <xsd:simpletype> */

export class SimpleType extends types.TypeBase {
  static mayContain: () => types.BaseClass[] = () => [
    types.Annotation,
    types.Restriction,
    types.List,
    types.Union,
  ]

  setEnumerationList(enumerationList: string[]) {
    this.enumerationList = enumerationList
  }

  getEnumerationList() {
    return this.enumerationList
  }

  setPattern(pattern: string) {
    this.pattern = pattern
  }

  getPattern() {
    return this.pattern
  }
  setMinLength(minLength: string) {
    this.minLength = minLength
  }

  getMinLength() {
    return this.minLength
  }
  setMaxLength(maxLength: string) {
    this.maxLength = maxLength
  }

  getMaxLength() {
    return this.maxLength
  }
  setTotalDigits(totalDigits: string) {
    this.totalDigits = totalDigits
  }

  getTotalDigits() {
    return this.totalDigits
  }
  setMaxInclusive(maxInclusive: string) {
    this.maxInclusive = maxInclusive
  }

  getMaxInclusive() {
    return this.maxInclusive
  }
  setMinInclusive(minInclusive: string) {
    this.minInclusive = minInclusive
  }

  getMinInclusive() {
    return this.minInclusive
  }

  private enumerationList: string[]
  private pattern: string
  private minLength: string
  private maxLength: string
  private maxInclusive: string
  private minInclusive: string
  private totalDigits: string
}
