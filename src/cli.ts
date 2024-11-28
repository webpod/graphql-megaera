#!/usr/bin/env node

import process from 'node:process'
import * as os from 'node:os'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { buildSchema } from 'graphql/utilities/index.js'
import { Source } from 'graphql/language/index.js'
import { GraphQLSchema } from 'graphql/type/index.js'
import { GraphQLError } from 'graphql/error/index.js'
import { styleText } from 'node:util'
import { traverse } from './visitor.js'
import { generate } from './generate.js'
import { plural } from './utils.js'

void (async function main() {
  let schemaFileOrUrl: string | undefined
  let inputFiles: string[] = []

  const args = process.argv.slice(2)
  if (args.length === 0) {
    usage()
    return
  }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h') {
      usage()
      return
    } else if (arg == '--schema') {
      schemaFileOrUrl = args[++i]
    } else if (arg.startsWith('--schema=')) {
      schemaFileOrUrl = arg.slice('--schema='.length)
    } else if (arg.startsWith('--')) {
      console.error(`Unknown flag: ${arg}`)
      process.exitCode = 1
      return
    } else {
      inputFiles.push(arg)
    }
  }

  if (schemaFileOrUrl === undefined) {
    console.error(
      `Missing schema file or URL. Use --schema=<file-or-url> flag to specify it.`,
    )
    process.exitCode = 1
    return
  }
  if (inputFiles.length === 0) {
    console.error(
      `Missing input files. Specify input files ./src/**/*.graphql to generate types.`,
    )
    process.exitCode = 1
    return
  }

  schemaFileOrUrl = homeDirExpand(schemaFileOrUrl)
  inputFiles = inputFiles.map((f) => homeDirExpand(f))

  let schemaSource: string
  if (/https?:\/\//.test(schemaFileOrUrl)) {
    const headers = new Headers()
    if (process.env.GITHUB_TOKEN) {
      const token = process.env.GITHUB_TOKEN
      headers.set('Authorization', `Bearer ${token}`)
    }
    const using = headers.has('Authorization') ? ` using $GITHUB_TOKEN` : ``
    console.log(`Fetching schema from ${schemaFileOrUrl}${using}.`)
    schemaSource = await fetch(schemaFileOrUrl, { headers }).then((r) =>
      r.text(),
    )
  } else {
    schemaSource = fs.readFileSync(schemaFileOrUrl, 'utf-8')
  }

  let schema: GraphQLSchema
  try {
    schema = buildSchema(schemaSource)
  } catch (e) {
    console.error(
      styleText(['bgRed', 'whiteBright', 'bold'], `Failed to parse schema`),
    )
    throw e
  }

  for (let inputFile of inputFiles) {
    const dirName = path.dirname(inputFile)
    const fileName = path.basename(inputFile)

    console.log(`Processing ${inputFile}`)

    const source = new Source(fs.readFileSync(inputFile, 'utf-8'), fileName)
    const content = traverse(schema, source)
    const code = generate(content)

    const ops = plural(
      content.operations.length,
      '%d operation',
      '%d operations',
    )
    const frg = plural(content.fragments.size, '%d fragment', '%d fragments')
    console.log(`> ${styleText('green', 'done')} (${ops}, ${frg})`)

    const prefix = `// DO NOT EDIT. This is a generated file. Instead of this file, edit "${fileName}".\n\n`
    fs.writeFileSync(
      path.join(dirName, fileName + '.ts'),
      prefix + code,
      'utf-8',
    )
  }
})().catch((e) => {
  if (e instanceof GraphQLError) {
    console.error(e.toString())
    process.exitCode = 1
  } else {
    throw e
  }
})

function usage() {
  console.log(`Usage: megaera [options] <input-files...>`)
  console.log(`Options:`)
  console.log(`  --schema=<file-or-url>  GraphQL schema file or URL`)
  process.exitCode = 2
}

function homeDirExpand(file: string) {
  if (file.startsWith('~')) {
    return path.join(os.homedir(), file.slice(1))
  }
  return file
}
