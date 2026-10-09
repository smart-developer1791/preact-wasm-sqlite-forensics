export function getExplainableQuery(sql: string) {
  const normalized = normalizeSingleStatement(sql)
  if (!normalized) {
    return {
      error: 'Enter a SELECT or WITH query before running Explain plan.',
    }
  }

  if (/;\s*\S/.test(normalized)) {
    return {
      error: 'Explain plan supports one SQL statement at a time. Select a single query before explaining it.',
    }
  }

  const query = normalized.replace(/^EXPLAIN\s+QUERY\s+PLAN\s+/i, '').trim()
  if (getStatementKind(query) !== 'select') {
    return {
      error: 'Explain plan is limited to SELECT and WITH queries in this workbench.',
    }
  }

  return { query }
}

export function normalizeSingleStatement(sql: string) {
  return sql.trim().replace(/[;\s]+$/g, '').trim()
}

export function hasMultipleStatements(sql: string) {
  return hasMultipleSqlStatements(sql)
}

export function getAutoRunnableQuery(sql: string) {
  const query = normalizeSingleStatement(sql)
  if (!query) return null
  if (hasMultipleStatements(query)) return null
  if (getStatementKind(query) !== 'select') return null
  return query
}

type SqlToken = {
  value: string
}

function getStatementKind(sql: string) {
  const tokens = tokenizeSql(sql)
  const first = tokens[0]?.value.toUpperCase()
  if (!first) return 'unknown'
  if (first === 'SELECT') return 'select'
  if (first !== 'WITH') return first.toLowerCase()

  const mainStatement = getWithMainStatement(tokens)
  return mainStatement?.toUpperCase() === 'SELECT' ? 'select' : (mainStatement?.toLowerCase() ?? 'unknown')
}

function getWithMainStatement(tokens: SqlToken[]) {
  let index = 1
  if (isWord(tokens[index], 'RECURSIVE')) index += 1

  while (index < tokens.length) {
    if (!tokens[index] || !isIdentifierLike(tokens[index])) return null
    index += 1

    if (tokens[index]?.value === '(') {
      index = skipBalancedTokens(tokens, index)
    }

    while (index < tokens.length && !isWord(tokens[index], 'AS')) {
      index += 1
    }
    if (!isWord(tokens[index], 'AS')) return null
    index += 1

    if (isWord(tokens[index], 'NOT')) index += 1
    if (isWord(tokens[index], 'MATERIALIZED')) index += 1

    if (tokens[index]?.value !== '(') return null
    index = skipBalancedTokens(tokens, index)

    if (tokens[index]?.value === ',') {
      index += 1
      continue
    }

    return tokens[index]?.value ?? null
  }

  return null
}

function tokenizeSql(sql: string) {
  const tokens: SqlToken[] = []
  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index]
    const next = sql[index + 1]

    if (/\s/.test(char)) continue

    if (char === '-' && next === '-') {
      index = skipLineComment(sql, index)
      continue
    }

    if (char === '/' && next === '*') {
      index = skipBlockComment(sql, index)
      continue
    }

    if (char === "'" || char === '"' || char === '`') {
      index = skipQuoted(sql, index, char)
      continue
    }

    if (char === '[') {
      index = skipBracketQuoted(sql, index)
      continue
    }

    if (/[A-Za-z_]/.test(char)) {
      let end = index + 1
      while (end < sql.length && /[A-Za-z0-9_$]/.test(sql[end])) end += 1
      tokens.push({ value: sql.slice(index, end) })
      index = end - 1
      continue
    }

    if ('(),;='.includes(char)) {
      tokens.push({ value: char })
    }
  }

  return tokens
}

function hasMultipleSqlStatements(sql: string) {
  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index]
    const next = sql[index + 1]

    if (char === '-' && next === '-') {
      index = skipLineComment(sql, index)
      continue
    }

    if (char === '/' && next === '*') {
      index = skipBlockComment(sql, index)
      continue
    }

    if (char === "'" || char === '"' || char === '`') {
      index = skipQuoted(sql, index, char)
      continue
    }

    if (char === '[') {
      index = skipBracketQuoted(sql, index)
      continue
    }

    if (char === ';' && hasMeaningfulSqlAfter(sql, index + 1)) {
      return true
    }
  }

  return false
}

function hasMeaningfulSqlAfter(sql: string, start: number) {
  for (let index = start; index < sql.length; index += 1) {
    const char = sql[index]
    const next = sql[index + 1]

    if (/\s/.test(char) || char === ';') continue
    if (char === '-' && next === '-') {
      index = skipLineComment(sql, index)
      continue
    }
    if (char === '/' && next === '*') {
      index = skipBlockComment(sql, index)
      continue
    }

    return true
  }

  return false
}

function skipBalancedTokens(tokens: SqlToken[], start: number) {
  let depth = 0
  for (let index = start; index < tokens.length; index += 1) {
    if (tokens[index].value === '(') depth += 1
    if (tokens[index].value === ')') depth -= 1
    if (depth === 0) return index + 1
  }

  return tokens.length
}

function skipLineComment(sql: string, start: number) {
  const nextLine = sql.indexOf('\n', start + 2)
  return nextLine === -1 ? sql.length : nextLine
}

function skipBlockComment(sql: string, start: number) {
  const close = sql.indexOf('*/', start + 2)
  return close === -1 ? sql.length : close + 1
}

function skipQuoted(sql: string, start: number, quote: string) {
  for (let index = start + 1; index < sql.length; index += 1) {
    if (sql[index] !== quote) continue
    if (sql[index + 1] === quote) {
      index += 1
      continue
    }
    return index
  }

  return sql.length
}

function skipBracketQuoted(sql: string, start: number) {
  const close = sql.indexOf(']', start + 1)
  return close === -1 ? sql.length : close
}

function isWord(token: SqlToken | undefined, word: string) {
  return token?.value.toUpperCase() === word
}

function isIdentifierLike(token: SqlToken) {
  return /^[A-Za-z_][A-Za-z0-9_$]*$/.test(token.value)
}
