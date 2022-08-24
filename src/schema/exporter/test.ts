import { Member } from '../Member'
import { MemberRef } from '../MemberRef'
import { Type } from '../Type'
import { Exporter } from './Exporter'

export class TS extends Exporter {
  static formatComment(indent: string, comment: string) {
    var lineList = comment.split('\n')
    var lineCount = lineList.length
    var blankCount = 0
    var contentCount = 0
    var output: string[] = []
    var prefix = '/**'

    for (var line of lineList) {
      // Remove leading and trailing whitespace.
      line = line.trim()

      if (!line) ++blankCount
      else {
        if (blankCount && contentCount) output.push(indent + prefix)

        output.push(indent + prefix + ' ' + line)
        prefix = '  *'

        ++contentCount
        blankCount = 0
      }
    }

    if (output.length) output[output.length - 1] += ' */'

    return output.join('\n')
  }

  exportSourceList(sourceList: string[]) {
    const header = '// Source files:'

    const output = sourceList.map((source) => `// ${source}`)

    return `${header}
${output.join('\n')}`
  }

  writeImport(shortName: string, relativePath: string, absolutePath: string) {
    return `import * as ${shortName} from '${relativePath}';`
  }

  writeContents(): string {
    const output = this.writeHeader()
    const doc = this.doc
    const namespace = this.namespace
    var prefix: string

    const outputWithSourceList = `${output}\n${this.exportSourceList(namespace.sourceList)}\n`

    this.writeAugmentations(output)

    // output.push('interface ' + baseName + ' {');
    // output.push('\t_exists: boolean;');
    // output.push('\t_namespace: string;');
    // output.push('}');

    const outputWithCustomTypes = `${outputWithSourceList}

import {Element, Text} from 'xast'

export interface TextNode<T extends string = string> extends Element {
  type: "element"
  name: T
  children: [Text]
}    

export type ValuesType<T extends ReadonlyArray<any> | ArrayLike<any> | Record<any, any>> = T extends ReadonlyArray<any> ? T[number] : T extends ArrayLike<any> ? T[number] : T extends object ? T[keyof T] : never;

export type NoUndefined<T> = Exclude<T, undefined>

export type ArrayValueMaybe<T> = T extends any[]
? ValuesType<NoUndefined<T>>
: NoUndefined<T>
export type AllTypes<T> = ArrayValueMaybe<ValuesType<T>>
    
export type RequiredMap<T> = AllTypes<T>`

    const prettierTypes = namespace.typeList
      .map((type) => {
        if (!type) return
        type.safeName = makeNameBetter(type.safeName)
        return type
      })
      .filter(Boolean)

    namespace.memberList.forEach((member) => {
      if (!member) return
      member.safeName = makeNameBetter(member.safeName)
    })

    for (var type of prettierTypes
      .slice(0)
      .sort((a: Type, b: Type) => a.safeName.localeCompare(b.safeName))) {
      if (!type) continue
      if (type.isSimpleType && /5.3.1/.test(namespace.name))
        console.log('simpletype', type.safeName)

      if (type.isComplexType && /5.3.1/.test(namespace.name))
        console.log('complexType', type.safeName)

      output.push(this.writeType(type))
    }

    const alreadyVisitedMembers: string[] = []
    // The typelist does not include all types,
    // as it treats all the Members which have a type of string as the same
    // but, we don't treat them as the same.
    // So, we need to add the missing types.
    namespace.memberList.forEach((member) => {
      const { namespace, ...useful } = member
      if (/5.3.1/.test(namespace.name)) {
        console.log(useful)
      }
      if (
        member.typeList &&
        member.typeList[0] &&
        (member.typeList[0].childList.length > 0 || member.typeList[0].attributeList.length > 0)
      )
        return

      if (/volume/i.test(member.safeName)) {
        const type = namespace.typeList.find((type) => /publishername/i.test(type?.safeName))

        console.log('HERE')
        console.log(member, type)
      }
      if (
        namespace.typeList.find(
          (type) =>
            // new RegExp(member.safeName, 'i').test(type?.safeName ?? type?.name ?? ''),
            member?.safeName?.toLowerCase() === type?.safeName?.toLowerCase(),
        )
      ) {
        console.log(`${member.safeName} is already defined`)
        return
      }

      if (!member.safeName || !member.name) {
        console.log('Member without name: ', member.name)
        return
      }

      if (alreadyVisitedMembers.includes(member.safeName)) {
        console.log('Member already visited: ', member.name)
        return
      }

      alreadyVisitedMembers.push(member.safeName)
      const goodName = member.safeName
        .replace(/_(\w)/g, (_, c) => c.toUpperCase())
        .replace(/^(\w)/, (_, c) => c.toUpperCase())

      const out = `${
        member.comment ? `${TS.formatComment('', member.comment)}\n` : ''
      }export type ${goodName} = TextNode<"${member.name}">;\n`

      output.push(out)
    })

    output.push('export interface ' + docName + ' extends ' + baseName + ' {')

    for (var child of doc.childList) {
      var outElement = this.writeMember(child, true)
      if (outElement) {
        output.push(outElement)
      }
    }

    output.push('}')
    output.push('export var ' + docName + ': ' + docName + ';\n')

    return output.join('\n')
  }
  getOutName(name: string) {
    return name + '.d.ts'
  }

  construct = TS

  writeSubstitutions(type: Type, refList: MemberRef[], output: string) {
    const refs: string = refList.reduce((acc, ref) => {
      const proxy = ref.member.proxy
      if (!ref.member.isAbstract) return `${acc}\n${this.writeMember(ref, false)}`

      if (proxy && proxy != type)
        return `${acc}\n${this.writeSubstitutions(proxy, proxy.childList, acc)}`

      return acc
    }, '')

    // for (var ref of refList) {
    //   var proxy = ref.member.proxy

    //   if (!ref.member.isAbstract) output.push(this.writeMember(ref, false))

    // }

    const mixIns: string = type.mixinList.reduce((acc, mixin) => {
      if (mixin === type) return acc
      return `${acc}\n${this.writeSubstitutions(mixin, mixin.childList, output)}`
    }, '')

    return `${refs}\n${mixIns}`
    // for (var mixin of type.mixinList) {
    //   if (mixin != type) this.writeSubstitutions(mixin, mixin.childList, output)
    // }
  }

  writeAugmentations(output: string) {
    var namespace = this.namespace

    const newOut = Object.keys(namespace.augmentTbl).map((namespaceId) => {
      var augmentTbl = namespace.augmentTbl[namespaceId]
      var typeIdList = Object.keys(augmentTbl)
      var type = augmentTbl[typeIdList[0]].type
      var other = type.namespace

      const outputWithDeclaration = `${output}\ndeclare module '${this.getPathTo(other.name)}' {\n`

      const contents = typeIdList.map((typeId) => {
        type = augmentTbl[typeId].type

        for (var ref of augmentTbl[typeId].refList) {
          ref.safeName = ref.member.safeName
        }
        const substitutions = this.writeSubstitutions(type, augmentTbl[typeId].refList, output)
        return `export interface _${type.safeName} {
${substitutions}
}`
      })

      return `${outputWithDeclaration}${contents.join('\n')}\n}`
    })
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
}
