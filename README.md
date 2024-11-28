# GraphQL Megaera

<p align="center">
  <img src=".github/graphql-megaera.svg" width="220" alt="GraphQL Megaera"><br>
  <strong>GraphQL to TypeScript Generator</strong><br><br>
  <a href="https://www.npmjs.com/package/megaera"><img src="https://badgen.net/npm/v/megaera" alt="npm"></a> <a href="https://github.com/webpod/graphql-megaera/actions/workflows/test.yml"><img src="https://github.com/webpod/graphql-megaera/actions/workflows/test.yml/badge.svg?branch=main" alt="test"></a>
</p>

## Example

<table align="center">
<tr>
  <th>From GraphQL</th>
  <th>To TypeScript</th>
</tr>
<tr>
  <td>

```graphql
query IssuesQuery {
  issues(first: 100) {
    totalCount
    nodes {
      createdAt
      closedAt
      closed
      author {
        login
      }
      number
      title
      labels(first: 10) {
        totalCount
        nodes {
          name
        }
      }
      body
      comments(first: 10) {
        totalCount
        nodes {
          body
        }
      }
      repository {
        owner {
          login
        }
        name
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
  rateLimit {
    limit
    cost
    remaining
    resetAt
  }
}
```

</td>
<td>

```ts
type IssuesQuery = () => {
  issues: {
    totalCount: number
    nodes: Array<{
      createdAt: string
      closedAt: string | null
      closed: boolean
      author: {
        login: string
      }
      number: number
      title: string
      labels: {
        totalCount: number
        nodes: Array<{
          name: string
        }>
      }
      body: string
      comments: {
        totalCount: number
        nodes: Array<{
          body: string
        }>
      }
      repository: {
        owner: {
          login: string
        }
        name: string
      }
    }>
    pageInfo: {
      hasNextPage: boolean
      endCursor: string | null
    }
  }
  rateLimit: {
    limit: number
    cost: number
    remaining: number
    resetAt: string
  }
}
```

  </td>
</tr>
</table>

## Installation

```bash
npm install megaera
```

## Usage

```bash
megaera --schema=schema.graphql ./src/**/*.graphql
```

Megaera will generate TypeScript code for all queries in the specified files.

## FAQ

<details>
<summary><strong>How to use Megaera?</strong></summary>

Put your queries in `.graphql` files, and run `megaera` to generate TypeScript code from them.

Megaera will copy the query string to the generated TypeScript file, so you can
import it in your TypeScript code.

```ts
import { IssuesQuery } from './query.graphql.ts'
```

The `IssuesQuery` variable is a string with the GraphQL query. You can use it
directly in your code, or pass it to a function that accepts a query.

Also, `IssuesQuery` carries the type of the query, so you can use it to infer
the return type of the query, and the types of the input variables.

```ts
type Result = ReturnType<IssuesQuery>
```

The type `IssuesQuery` can also be used independently:

```ts
import type { IssuesQuery } from './query.graphql.ts'
```

</details>

<details>
<summary><strong>How to get the return type of a query?</strong></summary>

Megaera generates TypeScript types for queries as functions.

```ts
type UserQuery = (vars: { login?: string }) => {
  user: {
    login: string
    avatarUrl: string
    name: string
  }
}
```

To get the return type of a query, use the `ReturnType` utility type:

```ts
type Result = ReturnType<UserQuery>
```

</details>

<details>
<summary><strong>How to get the types of the variables of a query?</strong></summary>

The first parameter of the query function is the variables.

You can use TypeScript's `Parameters` utility type to get the types of the variables:

```ts
type Variables = Parameters<UserQuery>[0]
```

Or you can use the `Variables` utility type to get the types of the variables:

```ts
import { Variables } from 'megaera'

type Variables = Variables<UserQuery>
```

</details>

<details>
<summary><strong>Why query string is copied to TypeScript file as well?</strong></summary>

To make it easier to import queries in TypeScript projects. As well to connect
generated output types with query source code.

This allows for library authors to create a function that accepts a query, and
infers the return type from the query, as well as the types of the variables.

For example, wrap [Octokit](https://github.com/octokit/octokit.js) in a function
that accepts a query and returns the result:

```ts
import { Query, Variables } from 'megaera'
import { IssuesQuery } from './query.graphql.ts'

function query<T extends Query>(query: T, variables?: Variables<T>) {
  return octokit.graphql<ReturnType<T>>(query, variables)
}

// Return type, and types of variables are inferred from the query.
const { issues } = await query(IssuesQuery, { login: 'webpod' })
```

</details>

<details>
<summary><strong>Does Megaera support fragments?</strong></summary>

Yes, Megaera fully supports fragments. Fragments are generated as separate types,
and can be used independently.

```graphql
query IssuesQuery($login: String) {
  issues(login: $login) {
    totalCount
    nodes {
      ...Issue
    }
  }
}

fragment Issue on Issue {
  number
  author {
    login
  }
  createdAt
  closedAt
}
```

The generated TypeScript code will have a type `Issue` that can be used independently:

```ts
import { Issue, IssuesQuery } from './query.graphql.ts'

const firstIssue: Issue = query(IssuesQuery).issues.nodes[0]
```

</details>

<details>
<summary><strong>Can Megaera extract queries from `.ts` files?</strong></summary>

No. To simplify development of Megaera, it is only possible to extract queries
from `.graphql` files.

But it should be possible to create plugins for webpack, rollup, or other
bundlers that can extract queries from `.ts` files. If you are interested in
this, please open an issue.

</details>

## License

[MIT](LICENSE)
