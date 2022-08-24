// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import { Cache } from 'cget'
import { Exporter } from './Exporter'
import { Namespace } from '../Namespace'
import { Member } from '../Member'
import { MemberRef } from '../MemberRef'
import { Type } from '../Type'
import { text } from 'stream/consumers'
import { makeNameBetter } from '../../makeNameBetter'
import { format } from 'path'

var docName = 'document'
var baseName = 'Element'

/** Export parsed schema to a TypeScript d.ts definition file. */

const textNode = ({ name, type }: { name?: string; type?: Type } = {}) =>
  `Element & {
name: ${!name || name === 'string' ? 'string' : `"${name}"`}
children: [{
  type: 'text'${
    type?.minInclusive ||
    type?.maxInclusive ||
    type?.minLength ||
    type?.maxLength ||
    type?.pattern ||
    type?.totalDigits
      ? `\n/**${formatTypeAnnotations(type)}**/`
      : ''
  }
  value: string
}]
}`

const formatTypeAnnotations = (type: Type) => {
  const { pattern, minInclusive, maxInclusive, minLength, maxLength, totalDigits } = type

  const p = pattern ? ` * @pattern ${pattern}` : ''
  const mi = minInclusive ? ` * @minInclusive ${minInclusive}` : ''
  const ma = maxInclusive ? ` * @maxInclusive ${maxInclusive}` : ''
  const ml = minLength ? ` * @minLength ${minLength}` : ''
  const mx = maxLength ? ` * @maxLength ${maxLength}` : ''
  const td = totalDigits ? ` * @maxLength ${totalDigits}\n   * @minLength ${totalDigits}` : ''

  const annotations = [p, mi, ma, ml, mx, td].filter((x) => x).join('\n ')

  return annotations ? `\n  ${annotations}\n` : ''
}
export class TS extends Exporter {
  /**
   * List of types which get extended from and are very badly fixed at the end
   * by just manually making their `name: string`
   */
  extendedFrom: string[] = []

  /** Format an XSD annotation as JSDoc. */
  static formatComment(indent: string, comment?: string, type?: Type) {
    const lineList = comment?.split('\n')
    const prefix = '/**'
    if (
      !comment &&
      (!type ||
        (!type?.minInclusive &&
          !type?.minLength &&
          !type?.maxLength &&
          !type?.maxInclusive &&
          !type?.totalDigits &&
          !type?.pattern))
    )
      return ''

    const description = `${lineList
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, idx) => `${idx > 0 ? `${indent}  * ` : ''}${line}`)
      .join('\n')}`

    const anno = type ? formatTypeAnnotations(type) : ''
    return `${indent}${prefix} ${description}${anno}${indent}${
      lineList.length > 1 ? '\n' + indent : ''
    }**/`
    // for (var line of lineList) {
    //   // Remove leading and trailing whitespace.
    //   line = line.trim()

    //   if (!line) ++blankCount
    //   else {
    //     if (blankCount && contentCount) output.push(indent + prefix)

    //     output.push(indent + prefix + ' ' + line)
    //     prefix = '  *'

    //     ++contentCount
    //     blankCount = 0
    //   }
    // }

    // if (output.length) {
    //   output[output.length - 1] += ' */'
    // }

    // return output.join('\n')
  }

  writeImport(shortName: string, relativePath: string, absolutePath: string) {
    return 'import * as ' + shortName + ' from ' + "'" + relativePath + "'" + ';'
  }

  /** Output list of original schema file locations. */

  exportSourceList(sourceList: string[]) {
    var output: string[] = []

    output.push('// Source files:')

    for (var urlRemote of sourceList) {
      output.push('// ' + urlRemote)
    }

    output.push('')
    return output
  }

  writeTypeRef(type: Type, namePrefix: string) {
    var output: string[] = []

    var namespace = type.namespace
    var name = namePrefix + makeNameBetter(type.safeName)
    if (!namespace || namespace == this.namespace) {
      output.push(name)
    } else {
      // Type from another, imported namespace.

      var short = this.namespace.getShortRef(namespace.id)

      if (short) {
        output.push(short + '.' + name)
      } else {
        console.error('MISSING IMPORT ' + namespace.name + ' for type ' + type.name)
        output.push('any')
      }
    }

    return output.join('')
  }

  writeParents(parentDef: string, mixinList: Type[]) {
    var parentList: string[] = []

    if (parentDef) parentList.push(parentDef.replace(/^_/, ''))

    for (var type of mixinList || []) {
      parentList.push(this.writeTypeRef(type, '_').replace(/^_/, ''))
    }

    if (!parentList.length) parentList.push(baseName)

    return (
      ' extends ' +
      parentList
        .map((parent) => {
          const cleanParent = parent.replace(/^_/, '')
          if (!this.extendedFrom.includes(cleanParent)) this.extendedFrom.push(cleanParent)
          return cleanParent
        })
        .join(', ')
    )
  }

  writeTypeList(ref: MemberRef, isAttribute = false) {
    var typeList = ref.member.typeList

    if (ref.max > 1 && ref.member.proxy) typeList = [ref.member.proxy]

    var outTypeList = typeList.map((type: Type) => {
      if (!(type.isPlainPrimitive && (!type.literalList || !type.literalList.length))) {
        return this.writeTypeRef(type, '')
      }

      const primitiveName = type.primitiveType.name

      return !isAttribute && ['string', 'number', 'boolean'].includes(primitiveName)
        ? makeNameBetter(ref.safeName || ref.member.safeName)
        : primitiveName
    })

    if (outTypeList.length == 0) return null

    var outTypes = outTypeList.sort().join(' | ')

    if (ref.max > 1) {
      if (outTypeList.length > 1) return '(' + outTypes + ')[]'
      else return outTypes + '[]'
    } else return outTypes
  }

  writeMember(ref: MemberRef, isGlobal: boolean, isAttribute = false) {
    var output: string[] = []
    var member = ref.member
    var comment = member.comment
    var indent = '\t'

    if ((ref as any).isHidden) return ''
    if (isGlobal && member.isAbstract) return ''
    if (member.name == '*') return ''

    if (comment) {
      output.push(TS.formatComment(indent, comment))
      output.push('\n')
    }

    output.push(indent + ref.safeName)
    if (ref.min == 0) output.push('?')
    output.push(': ')

    var outTypes = this.writeTypeList(ref, isAttribute)
    if (!outTypes) return ''

    output.push(outTypes)
    output.push(';')

    return output.join('')
  }

  writeTypeContent(type: Type, needsChildren = false) {
    var output: string[] = []

    if (type.isPlainPrimitive) {
      var literalList = type.literalList

      if (literalList && literalList.length > 0) {
        if (literalList.length > 1) {
          output.push('(' + literalList.join(' | ') + ')')
        } else output.push(literalList[0])
      } else output.push(type.primitiveType.name)
    } else if (type.isList) {
      output.push(this.writeTypeList(type.childList[0]))
    } else {
      var outMemberList: string[] = []

      var output: string[] = []
      var parentType = type.parent
      const safeName = type.safeName

      const outAttrList = type.attributeList
        .map((attribute) => {
          var outAttribute = this.writeMember(attribute, false, true)
          return outAttribute
            ?.replace(/: \b(boolean|number)\b/i, (_, c) => `: \`\$\{${c}\}\``)
            .replace(/(.*?): \bDate\b/i, '/** A date, unknown format **/\n$1: string')
          // .replace(/: (\w+)\Type/, ': $1')
        })
        .filter(Boolean)

      const outChildList = type.childList
        .map((child) => {
          var outChild = this.writeMember(child, false)
          if (!outChild) return

          /**
           * We want to replace 'child: string' with 'child: Child'
           * because cxsd assumes `type: string` to mean literally a string
           * but we want `{type: "text", value: string}` to be the lowest denominator.
           *
           * Later we will create the extra
           * `{
           *    type: "element",
           *    name: "child",
           *    children: [{type: "text", value: string}]
           * }`
           * elements that are missing
           */
          if (!/\b(string|number)\b/.test(outChild)) return outChild

          const outChildButText = outChild.replace(
            /((\w+)\??): \b(string|number)\b/,
            (_, name, val) => `${val}: ${makeNameBetter(child.safeName)}`,
          )
          return outChildButText
        })
        .filter(Boolean)

      const shittyChildren = `(${outChildList
        .map((child) =>
          child
            .replace(/\s*?(\/\*.+\/[ \n]*)?[\s\w\?\.-]*: ([\w\.-]*)\[?\]?;?/ims, '$2')
            .replace(';', ''),
        )
        .join(' | ')} )[]`

      const name =
        type.name ||
        (type.containingRef && type.containingRef.member && type.containingRef.member.name) ||
        type.safeName

      const out = `{
	type: 'element',
	name: '${/[A-Z]+/.test(name) ? name : name.replace(/(\w)/, (c) => c.toLowerCase())}',${
        outAttrList.length
          ? `
  attributes: {
	${outAttrList.join('\n\t')}
	}
`
          : ''
      }${
        outChildList.length
          ? `children: ${shittyChildren}` // RequiredMap<${safeName}Children>[]`
          : needsChildren
          ? '/** Element is self-closing */\nchildren: []'
          : ''
      }
}

${
  ''
  //   outChildList.length
  //     ? `export interface ${safeName}Children  {
  // 	${outChildList.join('\n\t')}
  // }`
  //     : ''
}
			`
      output.push(out)

      // if(outMemberList.length) {
      // 	output.push('\n');
      // 	output
      // 	output.push(outMemberList.join('\n'));
      // 	output.push('\n');
      // }
    }

    return output.join('')
  }

  writeType(type: Type, member?: MemberRef) {
    var namespace = this.namespace
    var output: string[] = []
    var comment =
      type.comment ||
      (member && member.member && member.member.comment) ||
      (type.containingRef && type.containingRef.member && type.containingRef.member.comment) ||
      ''

    type.safeName &&= makeNameBetter(type?.safeName)

    if (type.containingRef)
      type.containingRef.safeName &&= makeNameBetter(type?.containingRef?.safeName)

    if (type.containingRef)
      type.containingRef.member.safeName &&= makeNameBetter(type?.containingRef?.member?.safeName)

    if (type.parent) type.parent.safeName &&= makeNameBetter(type?.parent?.safeName)

    var parentDef: string
    var exportPrefix = type.isExported ? 'export ' : ''

    const name = type.safeName //type.safeName ? makeNameBetter(type?.safeName) : type?.safeName

    if (comment) {
      output.push(TS.formatComment('', comment, type))
      output.push('\n')
    }

    const needsChildren = !type.isPlainPrimitive && !type.parent
    const content = this.writeTypeContent(type, needsChildren)

    if (namespace.isPrimitiveSpace) {
      output.push(
        exportPrefix +
          'interface _' +
          name +
          this.writeParents(null, type.mixinList) +
          ' { ' +
          'content' +
          ': ' +
          type.primitiveType.name +
          '; }' +
          '\n',
      )

      return output.join('')
    }

    // if (/5.3.1/.test(namespace.name)) {
    //   ;/date_?t/i?.test(type.name ?? type.safeName) &&
    //     console.log(name, type, type.isPlainPrimitive)
    //   ;/day/i?.test(type.name ?? type.safeName) && console.log(type, type.isPlainPrimitive)
    // }

    if (type.isList) {
      output.push(exportPrefix + 'type ' + name + ' = ' + content + ';' + '\n')
      return output.join('')
    }

    if (type.isPlainPrimitive) {
      parentDef = this.writeTypeRef(type.parent, '_')

      if (!['string', 'number'].includes(content)) {
        // console.log(content)
        output.push(exportPrefix + 'type ' + name + ' = ' + content + ';' + '\n')
      } else {
        const outName =
          type?.containingRef?.member?.name ||
          type.parent.name ||
          type?.parent?.containingRef?.member?.name ||
          type.safeName

        if (type.attributeList?.length === 0 && type.childList?.length === 0) {
          // type.name
          // ? output.push(`export type ${name} =  ${outName}\n`)
          //   :
          output.push(`export type ${name} = ${textNode({ name: outName, type })};\n`)
        } else {
          output.push(`export type ${name} = ${textNode({ name: outName, type })};\n`)
        }
      }

      if (type.literalList && type.literalList.length) {
        output.push(
          'interface _' +
            name +
            this.writeParents(parentDef, type.mixinList) +
            ' { ' +
            'content' +
            ': ' +
            name +
            '; }' +
            '\n',
        )
        return output.join('')
      }
      // NOTE: Substitution groups are ignored here!
      // output.push('type _' + name + ' = ' + parentDef + ';' + '\n')
      return output.join('')
    }

    if (type.parent) parentDef = this.writeTypeRef(type.parent, '_')

    if (/primitive/i.test(parentDef)) parentDef = 'TextElement'
    output.push(
      'export interface ' +
        name +
        this.writeParents(parentDef, type.mixinList) +
        ' ' +
        content +
        '\n',
    )
    //output.push(exportPrefix + 'interface ' + name + ' extends _' + name + ' { constructor: { new(): ' + name + ' }; }' + '\n');
    //if(type.isExported) output.push(exportPrefix + 'var ' + name + ': { new(): ' + name + ' };' + '\n');

    return output.join('')
  }

  writeSubstitutions(type: Type, refList: MemberRef[], output: string[]) {
    for (var ref of refList) {
      var proxy = ref.member.proxy

      if (!ref.member.isAbstract) output.push(this.writeMember(ref, false))

      if (proxy && proxy != type) this.writeSubstitutions(proxy, proxy.childList, output)
    }

    for (var mixin of type.mixinList) {
      if (mixin != type) this.writeSubstitutions(mixin, mixin.childList, output)
    }
  }

  writeAugmentations(output: string[]) {
    var namespace = this.namespace

    for (var namespaceId of Object.keys(namespace.augmentTbl)) {
      var augmentTbl = namespace.augmentTbl[namespaceId]
      var typeIdList = Object.keys(augmentTbl)
      var type = augmentTbl[typeIdList[0]].type
      var other = type.namespace

      output.push('declare module ' + "'" + this.getPathTo(other.name) + "'" + ' {')

      for (var typeId of typeIdList) {
        type = augmentTbl[typeId].type

        output.push('export interface _' + type.safeName + ' {')

        for (var ref of augmentTbl[typeId].refList) {
          ref.safeName = ref.member.safeName
        }

        this.writeSubstitutions(type, augmentTbl[typeId].refList, output)

        output.push('}')
      }

      output.push('}')
    }
  }

  writeContents(): string {
    var output = this.writeHeader()
    var doc = this.doc
    var namespace = this.namespace
    var prefix: string

    output.push('')
    output = output.concat(this.exportSourceList(namespace.sourceList))

    output.push('')
    this.writeAugmentations(output)

    // output.push('interface ' + baseName + ' {');
    // output.push('\t_exists: boolean;');
    // output.push('\t_namespace: string;');
    // output.push('}');

    output.push(`
    export interface Attributes {
        [name: string]: string | null | undefined;
    }

    interface Text {
      type: 'text'
      value: string
    }

    interface Comment {
      type: 'comment'
      value: string
    }

    interface CData {
      type: 'cdata'
      value: string
    }

    interface Instruction {
      type: 'instruction'
      name: string
      value: string
    }

    export interface Element {
      type: "element"
      name: string
      attributes?: { [key: string]: string }
      children: (Element | Text | Comment | Instruction | CData)[]
    }

    interface TextElement extends Element {
      children: [Text]
    }
    `)
    //     output.push(`export type ValuesType<T extends ReadonlyArray<any> | ArrayLike<any> | Record<any, any>> = T extends ReadonlyArray<any> ? T[number] : T extends ArrayLike<any> ? T[number] : T extends object ? T[keyof T] : never;
    // export type NoUndefined<T> = Exclude<T, undefined>
    // export type ArrayValueMaybe<T> = T extends any[]
    // ? ValuesType<NoUndefined<T>>
    // : NoUndefined<T>
    // export type AllTypes<T> = ArrayValueMaybe<ValuesType<T>>

    // export type RequiredMap<T> = AllTypes<T>`)

    // const prettierTypes = namespace.typeList
    //   .map((type) => {
    //     if (!type) return
    //     type.safeName = makeNameBetter(type?.safeName)
    //     return type
    //   })
    //   .filter(Boolean)

    // namespace.memberList.forEach((member) => {
    //   if (!member) return
    //   member.safeName = makeNameBetter(member.safeName)
    // })

    const alreadyVisitedMembers: string[] = []

    const alreadyVisitedTypes: string[] = []
    const members = namespace.memberList
      .sort((a, b) => a.safeName.localeCompare(b.safeName))
      .reduce((acc, member, idx) => {
        member.safeName = makeNameBetter(member.safeName)
        if (!member) return acc
        // if (alreadyVisitedMembers.includes(member.safeName)) return acc

        // alreadyVisitedMembers.push(member.safeName)

        // if (/5.3/.test(namespace.name) && /date_?t/i.test(member?.safeName)) {
        //   const { namespace, ...useful } = member
        //   // console.log(useful)
        // }

        /**
         * Print all the children
         */
        const types = member.typeList.reduce((acc, type) => {
          if (!type) return acc

          if (
            type.maxInclusive ||
            type.minInclusive ||
            type.maxLength ||
            type.minLength ||
            type.totalDigits
          ) {
            console.log(type)
          }
          type.safeName = makeNameBetter(type.safeName)

          // TODO: Figureout what to do with lists
          if (type.isList && !alreadyVisitedTypes.includes(type.safeName)) {
            alreadyVisitedTypes.push(type.safeName)

            acc = `${acc}\n${
              type.comment
                ? TS.formatComment(
                    '',
                    type.comment ??
                      'This is a list\nWe cannot currently accurately represent lists.\n',
                    type,
                  )
                : ''
            }\nexport type ${type.safeName} = string`
          }

          if (!type.isPlainPrimitive) {
            const writtenType = `${this.writeType(type)}`
            const writtenName = writtenType.replace(
              /.*(?:export )?(?:interface|type) (\w+).*/ims,
              '$1',
            )

            if (alreadyVisitedTypes.includes(type.safeName)) {
              return acc
            }
            alreadyVisitedTypes.push(type.safeName)

            return `${acc}\n${writtenType}`
          }

          const comment = type?.primitiveType?.comment ?? type.comment ?? member.comment
          if (
            /\b(string|number|boolean)\b/i.test(type?.name ?? type.safeName) &&
            !alreadyVisitedTypes.includes(member.safeName)
          ) {
            alreadyVisitedTypes.push(member.safeName)

            return `${acc}\n${comment ? TS.formatComment('', comment, type) : ''}\nexport type ${
              member.safeName
            } = ${textNode({
              name: member.name,
              type,
            })}`
          }

          if (type.literalList?.length > 0) {
            if (alreadyVisitedTypes.includes(type.safeName)) return acc
            alreadyVisitedTypes.push(type.safeName)
            return `${acc}\n${comment ? TS.formatComment('', comment, type) : ''}\nexport type ${
              type.safeName
            } = ${this.writeTypeContent(type)}`
          }

          const typetypeString =
            type.primitiveType.name === 'string'
              ? 'string'
              : type.primitiveType.name === 'Date'
              ? 'string'
              : `\`\$\{${type.primitiveType.name}\}\``

          const safeSafeName =
            type.safeName === member.safeName ? `${type.safeName}PrimitiveType` : type.safeName

          //acc = `${acc}\nexport type ${member.safeName} = ${safeSafeName} & ${typetypeString}`

          if (!alreadyVisitedTypes.includes(member.safeName)) {
            alreadyVisitedTypes.push(member.safeName)
            acc = `${acc}\n${comment ? TS.formatComment('', comment, type) : ''}\nexport type ${
              member.safeName
            } = ${textNode({ type })}`
          }

          if (alreadyVisitedTypes.includes(safeSafeName)) return acc
          alreadyVisitedTypes.push(safeSafeName)

          return `${acc}\n${
            comment ? TS.formatComment('', comment, type) : ''
          }\nexport type ${safeSafeName} = ${typetypeString}`
        }, '')

        return `${acc}\n${types}`
      }, '')

    const types = namespace.typeList.reduce((acc, type) => {
      if (!type) return acc
      type.safeName = makeNameBetter(type.safeName)

      if (alreadyVisitedTypes.includes(type.safeName)) return acc

      alreadyVisitedTypes.push(type.safeName)
      // don't do the types which are also members
      if (
        namespace.memberList.find(
          (member) => member?.safeName?.toLowerCase() === type.safeName.toLowerCase(),
        )
      ) {
        return acc
      }
      return `${acc}\n${this.writeType(type)}`
    }, '')

    // for (var type of prettierTypes
    //   .slice(0)
    //   .sort((a: Type, b: Type) => a.safeName.localeCompare(b.safeName))) {
    //   if (!type) continue
    //   if (type.isSimpleType && /5.3.1/.test(namespace.name))
    //     console.log('simpletype', type.safeName)

    //   if (type.isComplexType && /5.3.1/.test(namespace.name))
    //     console.log('complexType', type.safeName)

    //   output.push(this.writeType(type))
    // }

    // The typelist does not include all types,
    // as it treats all the Members which have a type of string as the same
    // but, we don't treat them as the same.
    // So, we need to add the missing types.
    // namespace.memberList.forEach((member) => {
    //   const { namespace, ...useful } = member
    //   if (/5.3.1/.test(namespace.name)) {
    //     console.log(useful)
    //   }
    //   if (
    //     member.typeList &&
    //     member.typeList[0] &&
    //     (member.typeList[0].childList.length > 0 || member.typeList[0].attributeList.length > 0)
    //   )
    //     return

    //   if (/volume/i.test(member.safeName)) {
    //     const type = namespace.typeList.find((type) => /publishername/i.test(type?.safeName))

    //     console.log('HERE')
    //     console.log(member, type)
    //   }
    //   if (
    //     namespace.typeList.find(
    //       (type) =>
    //         // new RegExp(member.safeName, 'i').test(type?.safeName ?? type?.name ?? ''),
    //         member?.safeName?.toLowerCase() === type?.safeName?.toLowerCase(),
    //     )
    //   ) {
    //     console.log(`${member.safeName} is already defined`)
    //     return
    //   }

    //   if (!member.safeName || !member.name) {
    //     console.log('Member without name: ', member.name)
    //     return
    //   }

    //   if (alreadyVisitedMembers.includes(member.safeName)) {
    //     console.log('Member already visited: ', member.name)
    //     return
    //   }

    //   alreadyVisitedMembers.push(member.safeName)
    //   const goodName = member.safeName
    //     .replace(/_(\w)/g, (_, c) => c.toUpperCase())
    //     .replace(/^(\w)/, (_, c) => c.toUpperCase())

    //   const out = `${
    //     member.comment ? `${TS.formatComment('', member.comment)}\n` : ''
    //   }export type ${goodName} = TextNode<"${member.name}">;\n`

    //   output.push(out)
    // })

    // output.push('export interface ' + docName + ' extends ' + baseName + ' {')

    //     const documentChildren = doc.childList.reduce((acc, child) => {
    //       if (!child) return acc

    //       const out = this.writeMember(child, true)
    //       if (!out) return acc
    //       return `${acc}\n${out}`
    //     }, '')
    //     // for (var child of doc.childList) {
    //     //   var outElement = this.writeMember(child, true)
    //     //   if (outElement) {
    //     //     output.push(outElement)
    //     //   }
    //     // }

    //     // output.push('}')
    //     // output.push('export var ' + docName + ': ' + docName + ';\n')
    //     const document = `export interface ${docName} extends ${baseName} {
    //   ${documentChildren}
    // }

    // export var ${docName}: ${docName};  `

    const out = `${output.join('\n')}\n${types}\n${members}\n` //${document}`

    const outFixedExtenders = this.extendedFrom.reduce((acc, extender) => {
      const extenderRegexp = new RegExp(
        `export interface (${extender}) extends (.*?name:)[^\\n]*`,
        'msg',
      )
      const extenderTypeRegexp = new RegExp(`export type (${extender}) = {\n.*`, 'g')

      const extenderPlainTypeRegexp = new RegExp(`export type (${extender}) = string`, 'g')
      const fixed = acc
        .replace(extenderRegexp, 'export interface $1 extends $2 string')
        .replace(extenderTypeRegexp, `export type $1 = {\n  name: string`)
        .replace(extenderPlainTypeRegexp, `export type $1 = ${textNode()}`)

      return fixed
    }, out)

    return outFixedExtenders
  }

  getOutName(name: string) {
    return name + '.d.ts'
  }

  construct = TS
}
