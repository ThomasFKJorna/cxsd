# xsd-to-xast

[![npm version badge](https://img.shields.io/npm/v/xsd-to-xast?color=%23cb0000&logo=npm)](https://npmjs.com/package/xsd-to-xast)

This is a fork of `cxsd` which tries to turn the output from `cxsd` into something for use with `[xast](https://github.com/syntax-tree/xast)`.

It will output types that look like

```ts
/** A container for all title-level metadata for a single book that is not part of a series or set. */
export interface BookMetadata extends Element {
  type: 'element'
  name: 'book_metadata'
  attributes: {
    language?: Language
    referenceDistributionOpts?: ReferenceDistributionOpts
  }
  children: RequiredMap<BookMetadataChildren>
}

export interface BookMetadataChildren {
  /** Abstract */
  abstract?: jats.Abstract[]
  /** The date a manuscript was accepted for publication. */
  acceptanceDate?: AcceptanceDate
  /** Container element for archive information */
  archiveLocations?: ArchiveLocations
  /** A list of articles, books, and other content cited by the item being registered */
  citationList?: CitationList
  /** The container for all who contributed to authoring or editing an item. */
  contributors?: Contributors
  /** Container element for CrossMark data. */
  crossmark?: Crossmark
  /** The container for elements related directly to a DOI. */
  doiData?: DoiData
  /** The edition Text of a book. edition_number should include only a number and not additional text such as "edition". For example, you should submit "3", not "third edition" or "3rd edition". Roman numerals are acceptable. */
  editionNumber?: Text
  /** The ISBN assigned to an entity. */
  isbn: Isbn[]
  /** Identifies books or conference proceedings that have no ISBN assigned. */
  noisbn: Noisbn
  /** Wrapper element for relationship metadata */
  program?: rel.Program
  /** The date of publication. Multiple dates are allowed to allow for different dates of publication for online and print versions. */
  publicationDate: PublicationDate[]
  /** A container for information about the publisher of the item being registered */
  publisher: Publisher[]
  /** A container for item identification numbers set by a publisher. */
  publisherItem?: PublisherItem
  /** A container for the title and original language title elements. */
  titles: Titles
}
```

## Explanation

Since its kinda hard to accurately represent XSDs in typescript, the `children` prop is not very true to the actual constraints provided by the XCSD.

It's difficult to represent an array of arbitrary size with some required members in Typescript, so to simplify things the children are something like

```ts
type BookMetdata['children'] = (jats.Abstract  | AcceptanceDate | CitationList ...)[]

```

This is not ideal, but the alternatives \(tuples\) really care about the order, which doesn't matter for the schema. If we have to choose between types that are too loose or too strict, I think too loose is better.

## Install

```sh
npm i -g xsd-to-xast prettier

# yarn global add xsd-to-xast prettier
# pnpm add --global xsd-to-xast prettier

```

## Usage

Ideally your types are accessible from a remote url.

If so, simply do e.g.

```sh
xsd-to-xast https://data.crossref.org/schemas/crossref5.3.1.xsd
```

and the types will be output somewhere.

### Local xsds

To parse local xsds, do

```sh
npx serve /path/to/dir/containing/xsds
xsd-to-xast http://localhost:3000/schemafilename.xsd

```

However, this step has also been automated, so if you do

```sh
npx xsd-to-xast /path/to/dir/containing/xsds/filename.xsd
```

it should work.

## Development

```sh
yarn
yarn build
./cxsd-cli.js <something>
```

The code is a bit of a mess, very hard to understand the structure of this project.

## Sponsors

Love these legends

<!-- sponsors -->
<!-- sponsors -->

# OLD README

`cxsd` is a streaming XSD parser and XML parser generator for Node.js and
(optionally but highly recommended) [TypeScript](http://www.typescriptlang.org/).
It automatically downloads all referenced `.xsd` files and outputs two files for each defined namespace:

- `.js` JavaScript code for Node.js containing a compact state machine table for the [cxml](https://github.com/charto/cxml) parser.
- `.d.ts` TypeScript definition with JSDoc comments to help editors with tab completion, type verification and tooltips.

Since namespaces map to source files, compiled namespaces can import others like normal JavaScript files.

[cxml](https://github.com/charto/cxml) itself is highly advanced and unlike other JavaScript XML parsers.
It fully supports namespaces, derived types and (soon) substitution groups.
Output structure is defined mainly by schema, not the XML input.
You can correctly parse files with completely unexpected structures (conditions apply) and element names,
if they refer to a schema mapping the contents to supported equivalents.

## Usage

```bash
echo '{ "scripts": { "cxsd": "cxsd" } }' > package.json
npm install cxsd
npm run cxsd http://schemas.opengis.net/wfs/1.1.0/wfs.xsd
```

The first line just sets up NPM to allow calling `cxsd` without installing it globally. It also works on Windows if you omit the single quotes (`'`).

This downloads 96 `.xsd` files (total about 720 kilobytes) and produces 9 `.js` files for the XML parser (total about 90 kilobytes)
and 9 `.d.ts` files (total about 480 kilobytes) for TypeScript editors to statically verify the parser output is correctly used and generally help the programmer.

You can import the resulting `.d.ts` and `.js` files from TypeScript:

```TypeScript
import * as wfs from './xmlns/www.opengis.net/wfs';
import * as ows from './xmlns/www.opengis.net/ows';

var metadata = wfs.document.WFS_Capabilities.OperationsMetadata;
```

See how the [Atom](https://atom.io/) editor with [atom-typescript](https://atom.io/packages/atom-typescript) understands the code in the screenshot at the top.

## Features

- Automatically download and cache to disk all imported .xsd files
- Convert XSD contents to ES6 equivalents (generated `.js` files call `cxml` to parse themselves into JavaScript structures)
  - Types to classes
    - Deriving from other types to inheriting other classes
  - Imports from remote URLs to imports from local relative paths
  - Strings, numbers and dates to matching primitive types
  - Lists to arrays
- To TypeScript equivalents (defined in `.d.ts` for working with source code)
  - Annotations to JSDoc comments
  - Enumerations to unions of string literals

## Related projects

- [CodeSynthesis XSD](http://codesynthesis.com/projects/xsd/) generates `C++`-based parsers out of XSD schema definitions.

# License

[The MIT License](https://raw.githubusercontent.com/charto/cxsd/master/LICENSE)

Copyright (c) 2015-2016 BusFaster Ltd
