// Kleiner Supabase-Ersatz im Speicher für die Revy-Tests. Kann genau das, was
// lib/revy braucht: select mit eq/in/not/gte/lte/order/limit, insert, update,
// upsert, head-Zählung, schema("revy") und einige rpc-Aufrufe. RLS gibt es
// hier nicht; die prüft tests/revy-db.test.ts gegen eine echte Datenbank.

type Row = Record<string, unknown>
type Filter = (r: Row) => boolean

export interface FakeDb {
  tables: Record<string, Row[]>
  rpc: Record<string, (args: Record<string, unknown>) => unknown>
}

class Query implements PromiseLike<{ data: unknown; error: null; count?: number }> {
  private filters: Filter[] = []
  private op: "select" | "insert" | "update" | "upsert" = "select"
  private payload: Row | Row[] | null = null
  private mode: "many" | "single" | "maybe" = "many"
  private orderBy: { col: string; asc: boolean } | null = null
  private max: number | null = null
  private head = false
  private returning = false
  private upsertKeys: string[] = []

  constructor(private db: FakeDb, private table: string) {}

  private rows(): Row[] {
    return (this.db.tables[this.table] ??= [])
  }

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op !== "select") this.returning = true
    if (opts?.head) this.head = true
    return this
  }
  insert(p: Row | Row[]) {
    this.op = "insert"
    this.payload = p
    return this
  }
  update(p: Row) {
    this.op = "update"
    this.payload = p
    return this
  }
  upsert(p: Row | Row[], opts?: { onConflict?: string }) {
    this.op = "upsert"
    this.payload = p
    this.upsertKeys = opts?.onConflict?.split(",") ?? ["id"]
    return this
  }
  eq(col: string, v: unknown) {
    this.filters.push((r) => r[col] === v)
    return this
  }
  in(col: string, vs: unknown[]) {
    this.filters.push((r) => vs.includes(r[col]))
    return this
  }
  not(col: string, op: string, v: unknown) {
    if (op === "is" && v === null) this.filters.push((r) => r[col] != null)
    return this
  }
  gte(col: string, v: string) {
    this.filters.push((r) => String(r[col]) >= v)
    return this
  }
  lte(col: string, v: string) {
    this.filters.push((r) => String(r[col]) <= v)
    return this
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, asc: opts?.ascending !== false }
    return this
  }
  limit(n: number) {
    this.max = n
    return this
  }
  single() {
    this.mode = "single"
    return this
  }
  maybeSingle() {
    this.mode = "maybe"
    return this
  }

  private match(): Row[] {
    return this.rows().filter((r) => this.filters.every((f) => f(r)))
  }

  private exec(): { data: unknown; error: null; count?: number } {
    let out: Row[] = []
    if (this.op === "select") {
      out = this.match()
      if (this.orderBy) {
        const { col, asc } = this.orderBy
        const cmp = (x: unknown, y: unknown) =>
          typeof x === "number" && typeof y === "number" ? x - y : String(x) < String(y) ? -1 : String(x) > String(y) ? 1 : 0
        out = [...out].sort((a, b) => cmp(a[col], b[col]) * (asc ? 1 : -1))
      }
      if (this.max != null) out = out.slice(0, this.max)
      if (this.head) return { data: null, error: null, count: out.length }
    } else if (this.op === "insert") {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload as Row]
      out = list.map((p) => {
        const row: Row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...p }
        if (this.table === "revy_audit") row.id = this.rows().length + 1
        this.rows().push(row)
        return row
      })
    } else if (this.op === "update") {
      out = this.match()
      out.forEach((r) => Object.assign(r, this.payload))
    } else if (this.op === "upsert") {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload as Row]
      out = list.map((p) => {
        const hit = this.rows().find((r) => this.upsertKeys.every((k) => r[k] === p[k]))
        if (hit) return Object.assign(hit, p)
        const row = { ...p }
        this.rows().push(row)
        return row
      })
    }
    if (this.op !== "select" && !this.returning) return { data: null, error: null }
    if (this.mode === "single" || this.mode === "maybe") return { data: out[0] ?? null, error: null }
    return { data: out, error: null }
  }

  then<A, B>(ok?: ((v: { data: unknown; error: null; count?: number }) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve(this.exec()).then(ok, bad)
  }
}

export function fakeClient(db: FakeDb, prefix = "") {
  const client = {
    from: (t: string) => new Query(db, prefix + t),
    rpc: async (name: string, args: Record<string, unknown>) => {
      const fn = db.rpc[prefix + name]
      if (!fn) return { data: null, error: { message: `rpc ${prefix + name} fehlt` } }
      return { data: fn(args), error: null }
    },
    schema: (s: string) => fakeClient(db, s === "public" ? "" : `${s}.`),
    storage: { from: () => ({ download: async () => ({ data: null }) }) },
  }
  return client
}
