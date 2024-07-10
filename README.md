# GraphQL Megaera

<p align="center">
  <img src=".github/graphql-megaera.svg" width="220" alt="GraphQL Megaera"><br>
  <strong>GraphQL TypeScript Generator</strong>
</p>

## Example

<table>
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

Import generated code in your TypeScript file:

```ts
import { IssuesQuery } from './query.graphql.js'

const { issues } = await octokit.graphql<ReturnType<IssuesQuery>>(IssuesQuery)
```

## FAQ

### Why query string is copied to TypeScript file as well?

To make it easier to import queries in TypeScript projects. As well to connect
generated output types with query source code.

This allows for library authors to create a function that accepts a query, and
infers the return type from the query, as well as the types of the variables.

For example, wrap [Octokit](https://github.com/octokit/octokit.js) in a function
that accepts a query and returns the result:

```ts
import { Query, Variables } from 'megaera'
import { IssuesQuery } from './query.graphql.js'

function query<T extends Query>(query: T, variables?: Variables<T>) {
  return octokit.graphql<ReturnType<T>>(query, variables)
}

// Return type, and types of variables are inferred from the query.
const { issues } = await query(IssuesQuery, { login: 'webpod' })
```

### Does Megaera support fragments?

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
import { Issue, IssuesQuery } from './query.graphql.js'

const firstIssue: Issue = query(IssuesQuery).issues.nodes[0]
```

## License

[MIT](LICENSE)
