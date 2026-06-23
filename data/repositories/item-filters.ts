import { raw } from "@/lib/azure-db";

/**
 * SQL item-code predicates shared by the client-facing repos, matching the
 * canonical Goodkind semantic-layer queries.
 *
 * SAP B1 item-code taxonomy (company-wide convention) `CLASS-BRAND-SEQ`:
 *   90- finished goods (sellable)      10-/20- raw materials & packaging
 *   30- WIP / bulk intermediates       (other classes: freight, misc)
 * Brand is the 2nd segment (DRS = Dr. Squatch, JUK = Jukebox).
 *
 * Sales-order ("Purchase Orders" tab) lines: show finished goods, exclude
 * materials & packaging → `LEFT(ItemCode,2) NOT IN ('10','20')`.
 *
 * Production-schedule output lines already restrict to output line types, so
 * they need only the brand scope (bulk/WIP outputs are intentionally shown).
 */

/**
 * Exclude raw-material (10-) and packaging (20-) lines — the semantic-layer
 * "Filter out materials and packaging" rule. `column` is a trusted SQL
 * identifier (e.g. "l.ItemCode"); never pass user input.
 */
export function excludeMaterialsFilter(column: string): { __raw: string } {
  return raw(`LEFT(${column}, 2) NOT IN ('10', '20')`);
}

/**
 * Optional brand scope. Restricts an item-code column to the given brand
 * codes via substring match (mirrors the semantic layer's `LIKE '%DRS%'`),
 * so a client doesn't see another brand's products. Codes are sanitized to
 * [A-Z0-9] so they can be safely inlined. Returns an always-true predicate
 * (`1 = 1`) when no codes are supplied, so it's safe to AND into any WHERE.
 *
 * @param column  Trusted SQL identifier (e.g. "l.ItemCode", "T1.U_ITEMCODE").
 * @param brandCodes  e.g. ["DRS"]. Empty/undefined → no brand restriction.
 */
export function brandCodeFilter(
  column: string,
  brandCodes?: string[]
): { __raw: string } {
  const codes = (brandCodes ?? [])
    .map((c) => c.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .filter(Boolean);

  if (codes.length === 0) return raw("1 = 1");

  const ors = codes.map((c) => `${column} LIKE '%${c}%'`).join(" OR ");
  return raw(`(${ors})`);
}

/**
 * Client-component scope for the BOM / component-status query. Components in
 * the `CLASS-BRAND-SEQ` taxonomy that a client supplies are packaging items in
 * the 20- class for that brand, e.g. "20-DRS-0123". This restricts a component
 * item-code column to `20-<BRAND>%` for the given brand codes.
 *
 * Unlike brandCodeFilter, this returns an always-FALSE predicate (`1 = 0`)
 * when no codes are supplied: BOM data must be brand-scoped, so with no brand
 * we show nothing rather than every client's components.
 *
 * @param column  Trusted SQL identifier (e.g. "i.U_ITEMCODE").
 * @param brandCodes  e.g. ["DRS"]. Empty/undefined → no components.
 */
export function componentBrandFilter(
  column: string,
  brandCodes?: string[]
): { __raw: string } {
  const codes = (brandCodes ?? [])
    .map((c) => c.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .filter(Boolean);

  if (codes.length === 0) return raw("1 = 0");

  const ors = codes.map((c) => `${column} LIKE '20-${c}%'`).join(" OR ");
  return raw(`(${ors})`);
}
