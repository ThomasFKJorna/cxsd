// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import { program } from 'commander'
import { exec as rawExec } from 'child_process'

import { Cache, FetchOptions } from 'cget'
import * as cxml from 'cxml'

import { Context } from './xsd/Context'
import { Namespace } from './xsd/Namespace'
import { Loader } from './xsd/Loader'
import { exportNamespace } from './xsd/Exporter'
import * as schema from './schema'
import { AddImports } from './schema/transform/AddImports'
import { Sanitize } from './schema/transform/Sanitize'
import { promisify } from 'util'
import { dirname, join } from 'path'

const exec = promisify(rawExec)
// type _ICommand = typeof cmd
// interface ICommand extends _ICommand {
//   arguments(spec: string): ICommand
// }

program
  .version(require('../package.json').version)
  .arguments('<url>')
  .description('XSD download and conversion tool')
  .option(
    '-H, --force-host <host>',
    'Fetch all xsd files from <host>\n    (original host is passed in GET parameter "host")',
  )
  .option('-P, --force-port <port>', 'Connect to <port> when using --force-host')
  // .option('-c, --cache-xsd <path>', 'Cache downloaded XSD filed under <path>')
  .option('-t, --out-ts <path>', 'Output TypeScript definitions under <path>')
  .option('-j, --out-js <path>', 'Output JavaScript modules under <path>')
  .option('--no-serve', "Don't try to resolve a local path by serving the files locally")
  .action(handleConvert)
  .parse(process.argv)

if (process.argv.length < 3) program.help()

async function handleConvert(urlRemote: string, opts: { [key: string]: any }) {
  var schemaContext = new schema.Context()
  var xsdContext = new Context(schemaContext)

  var fetchOptions: FetchOptions = {}

  if (opts['forceHost']) {
    fetchOptions.forceHost = opts['forceHost']
    if (opts['forcePort']) fetchOptions.forcePort = opts['forcePort']

    Cache.patchRequest()
  }
  if (!urlRemote.startsWith('http')) {
    console.log(
      'Looks like you supplied a path rather than a URL. Ill set up a local server to serve the files from.',
    )
    exec(`npx serve ${dirname(urlRemote)}`)
    await new Promise((r) => setTimeout(r, 5000))
  }

  var tsCache = new Cache(opts['outTs'] || 'xmlns', '_index.d.ts')

  var loader = new Loader(xsdContext, fetchOptions)

  loader.import(urlRemote).then((namespace: Namespace) => {
    try {
      exportNamespace(xsdContext.primitiveSpace, schemaContext)
      exportNamespace(xsdContext.xmlSpace, schemaContext)

      var spec = exportNamespace(namespace, schemaContext)

      var addImports = new AddImports(spec)
      var sanitize = new Sanitize(spec)

      var importsAdded = addImports.exec()

      // Find ID numbers of all types imported from other namespaces.
      importsAdded
        .then(() =>
          // Rename types to valid JavaScript class names,
          // adding a prefix or suffix to duplicates.
          sanitize.exec(),
        )
        .then(() => sanitize.finish())
        .then(() => addImports.finish(importsAdded.value()))
        // .then(() => new schema.exporter.JS(spec, jsCache).exec())
        .then(() => new schema.exporter.TS(spec, tsCache).exec())
        .then((res) => {
          return exec(`npx prettier -w ${opts['outTs'] || 'xmlns'}`)
        })
      // .then((res) => console.log(res))
    } catch (err) {
      console.error(err)
      console.log('Stack:')
      console.error(err.stack)
    }
  })
}
