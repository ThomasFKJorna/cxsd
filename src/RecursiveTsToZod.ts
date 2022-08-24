import { generate } from 'ts-to-zod'
import { program } from 'commander'
import { dirname, resolve, isAbsolute, join, basename, relative } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolveCname } from 'node:dns'

import { TsToZodConfig } from 'ts-to-zod'

const defaultConfig: Partial<TsToZodConfig> = {
  // capitalize
  getSchemaName: (id: string) =>
    id.replace(/^([a-z])/, (_, match) => match.toUpperCase()) + 'Schema',
  keepComments: true,
}

program
  .name('ts-to-zodr')
  .description('Better zod cli')
  .argument('<file>', 'Root File to start the conversion process from')
  .argument('<output>', 'Output file path')
  .action(convert)

const findImport = (text: string, path: string) => {
  const regex = /^import\s+\*\s+as\s([\w_.-]+)\s+from\s+(?:'|")([^'"]+)(?:"|')/

  // there's probably no import after line 100
  const lines = text.split('\n').slice(0, 100)
  const result = lines
    .filter((line) => regex.test(line))
    .map((line) => line.replace(regex, (_, alias, path) => `${alias}€${path}`).split('€'))
    .map((parts) => ({ alias: parts[0], path: parts[1] }))

  console.log(result)

  return result
}
type RecursivePath = { alias: string; path: string; children: RecursivePath[] }

let mem: string[] = []
let paths: RecursivePath = {} as RecursivePath

const resolvePath = (out: string, alias: string) => join(dirname(out), `${alias}.ts`)

const recursiveImport = async (
  filePath: string,
  out: string,
  { initialIn, initialOut }: { initialIn: string; initialOut: string },
  alias?: string,
): Promise<RecursivePath[]> => {
  const text = await readFile(filePath, 'utf8')
  const imports = findImport(text, filePath)

  const { errors, transformedSourceText, getZodSchemasFile } = generate({
    sourceText: text,
    ...defaultConfig,
  })

  const schemas = getZodSchemasFile(filePath)

  const textWithImports = `${imports
    .map((importPath) => `import * as ${importPath.alias} from  './${importPath.alias}'`)
    .join('\n')}\n${schemas}`

  const outPath = join(dirname(out), alias ? `${alias}.ts` : basename(out))
  const dirs = await mkdir(dirname(outPath), { recursive: true })

  const textWithRelativeImports = textWithImports.replace(
    /import\s(\{[\w,_.\s-]+\})\s+from\s+(?:'|")(.*?\.d)\.ts(?:"|')/g,
    (_, imports, path) =>
      `import ${imports} from '${relative(
        dirname(resolve(process.cwd(), initialOut)),
        join(path),
      )}'`,
  )

  /**
   * For some reason ts-to-zod makes `jats.Abstract` into `z.literal(jats.Abstract)`
   * which is nothing, so we fix it here like animals.
   */
  const schemasWithoutLiterals = textWithRelativeImports.replace(/z\.literal\((\w+\.\w+)\)/gi, '$1')

  /**
   * By default ts-to-zod import the types as they are, so we can't name the schemas like this.
   * All the schemas are used like `alias.Name`, so we need to rename them to `alias.NameSchema`.
   */
  const renamedSchemas = imports.reduce(
    (acc, { alias }) => acc.replace(new RegExp(`(${alias}\\.\\w+)`, 'g'), '$1Schema'),
    schemasWithoutLiterals,
  )

  const write = await writeFile(outPath, renamedSchemas)
  //   const tests = getIntegrationTestFile(filePath, outPath)

  //   const testsFile = await writeFile(join(dirname(out), 'tests.ts'), tests)

  const otherImports = await Promise.all(
    imports.map(async ({ alias, path }) => {
      if (mem.includes(path)) {
        return { alias, path, children: [] }
      }

      mem.push(path)

      const importPath = `${resolve(dirname(filePath), path)}.d.ts`
      console.log(importPath)
      const children = await recursiveImport(importPath, out, { initialIn, initialOut }, alias)

      return {
        alias,
        path,
        children,
      } as RecursivePath
    }),
  )

  return otherImports
}

function convert(filePath: string, outPath: string) {
  recursiveImport(filePath, outPath, { initialIn: filePath, initialOut: outPath })
}

program.parse()
