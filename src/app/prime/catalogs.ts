import { PRIME_CATALOGS } from './generated/prime.generated';

export { PRIME_CATALOGS };
export type PrimeCatalogName = keyof typeof PRIME_CATALOGS;

export function isCatalogValue<Catalog extends PrimeCatalogName>(catalog: Catalog, value: string): boolean {
  return (PRIME_CATALOGS[catalog] as readonly string[]).includes(value);
}
