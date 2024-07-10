#!/usr/bin/env node

import process from 'node:process'
import * as os from 'node:os'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { buildSchema } from 'graphql/utilities/index.js'
import { transpile } from './index.js'
import { Source } from 'graphql/language/index.js'

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

  const schema = buildSchema(fs.readFileSync(schemaFileOrUrl, 'utf-8'))
  for (let inputFile of inputFiles) {
    console.log(`Processing ${inputFile}...`)
    const dirName = path.dirname(inputFile)
    const fileName = path.basename(inputFile)
    const source = new Source(fs.readFileSync(inputFile, 'utf-8'), fileName)
    let code = transpile(schema, source)
    code =
      `// DO NOT EDIT. Instead of this file, edit "${fileName}" and rerun megaera".\n\n` +
      code
    fs.writeFileSync(path.join(dirName, fileName + '.ts'), code)
  }
})()

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
