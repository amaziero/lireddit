import { QueryInput, Cache } from "@urql/exchange-graphcache";

export function betterUpdateQuery<Results, Query>(
  cache: Cache,
  qi: QueryInput,
  result: any,
  fn: (r: Results, q: Query) => Query
) {
  return cache.updateQuery(qi, (data) => fn(result, data as any) as any);
}
