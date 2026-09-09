import { writeFileSync, mkdirSync } from 'node:fs';
import { schemaStatements } from '../lib/copilot/schema';
const camel = (s: string) => s.replace(/_([a-z])/g, (_, x) => x.toUpperCase());
const split = (s: string) => {
  let depth = 0,
    quote = false,
    start = 0;
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "'") quote = !quote;
    if (!quote) {
      if (s[i] === '(') depth++;
      if (s[i] === ')') depth--;
      if (s[i] === ',' && depth === 0) {
        out.push(s.slice(start, i).trim());
        start = i + 1;
      }
    }
  }
  out.push(s.slice(start).trim());
  return out;
};
let output =
  "// Generated from lib/copilot/schema.ts. Run npm run db:copilot-schema after model changes.\nimport {sqliteTable,text,integer,index,uniqueIndex,check} from 'drizzle-orm/sqlite-core';\nimport {sql} from 'drizzle-orm';\n";
for (const statement of schemaStatements) {
  const match = statement.match(/^CREATE TABLE IF NOT EXISTS (\w+) \((.*)\)$/);
  if (!match) continue;
  const [, table, body] = match,
    columns: string[] = [],
    constraints: string[] = [];
  for (const part of split(body)) {
    if (part.startsWith('UNIQUE(')) {
      const cs = part.slice(7, -1).split(',');
      constraints.push(
        `uniqueIndex('${table}_${cs.join('_')}_unique').on(${cs.map((c) => 't.' + camel(c)).join(',')})`,
      );
      continue;
    }
    const [, name, type, rest] = part.match(/^(\w+) (\w+)(.*)$/)!;
    let def = `${type === 'TEXT' ? 'text' : 'integer'}('${name}')`;
    if (rest.includes('PRIMARY KEY'))
      def += rest.includes('AUTOINCREMENT')
        ? '.primaryKey({autoIncrement:true})'
        : '.primaryKey()';
    if (rest.includes('NOT NULL')) def += '.notNull()';
    if (rest.includes(' UNIQUE')) def += '.unique()';
    const ref = rest.match(/REFERENCES (\w+)\((\w+)\)/);
    if (ref) def += `.references(()=>${camel(ref[1])}.${camel(ref[2])})`;
    const defaultValue = rest.match(/DEFAULT ('.*?'|\d+)/);
    if (defaultValue) def += `.default(${defaultValue[1]})`;
    const ck = rest.match(/CHECK\((.*)\)/);
    if (ck) constraints.push(`check('${table}_${name}_check',sql\`${ck[1]}\`)`);
    columns.push(` ${camel(name)}:${def},`);
  }
  for (const st of schemaStatements) {
    const idx = st.match(
      /^CREATE (UNIQUE )?INDEX IF NOT EXISTS (\w+) ON (\w+)\((.*)\)$/,
    );
    if (idx && idx[3] === table)
      constraints.push(
        `${idx[1] ? 'uniqueIndex' : 'index'}('${idx[2]}').on(${idx[4]
          .split(',')
          .map((c) => 't.' + camel(c))
          .join(',')})`,
      );
  }
  output += `export const ${camel(table)}=sqliteTable('${table}',{\n${columns.join('\n')}\n}${constraints.length ? ',t=>[' + constraints.join(',') + ']' : ''});\n`;
}
writeFileSync('db/copilot-schema.ts', output);
mkdirSync('database', { recursive: true });
writeFileSync(
  'database/postgresql.sql',
  `-- PostgreSQL / Neon: run before first production request, or let repository.ready initialize.\n${schemaStatements.map((s) => s.replace('seq INTEGER PRIMARY KEY AUTOINCREMENT', 'seq BIGSERIAL PRIMARY KEY') + ';').join('\n')}\n\n-- Optional indexed vector store (1536-dimensional embeddings).\nCREATE EXTENSION IF NOT EXISTS vector;\nCREATE TABLE IF NOT EXISTS cop_vectors (chunk_id TEXT PRIMARY KEY REFERENCES cop_chunks(id) ON DELETE CASCADE, tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), embedding vector(1536) NOT NULL);\nCREATE INDEX IF NOT EXISTS cop_vectors_hnsw ON cop_vectors USING hnsw (embedding vector_cosine_ops);\nCREATE INDEX IF NOT EXISTS cop_vectors_tenant ON cop_vectors(tenant_id);\n`,
);
console.log('Generated D1 models and PostgreSQL schema.');
