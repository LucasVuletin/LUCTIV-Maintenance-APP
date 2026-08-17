import { PRIME_DATA_DICTIONARY, PRIME_HEADERS, PRIME_SCHEMA_VERSION } from './generated/prime.generated';

export { PRIME_DATA_DICTIONARY, PRIME_HEADERS, PRIME_SCHEMA_VERSION };
export type PrimeFieldName = (typeof PRIME_HEADERS)[number];

export function assertPrimeContract(): void {
  if (PRIME_HEADERS.length !== 52) throw new Error('El contrato PRIME debe contener exactamente 52 campos.');
  const dictionaryFields = PRIME_DATA_DICTIONARY.map((entry) => entry.FieldName);
  if (dictionaryFields.some((field, index) => field !== PRIME_HEADERS[index])) {
    throw new Error('Pump_Stage_Log y Data_Dictionary no están sincronizados.');
  }
}
