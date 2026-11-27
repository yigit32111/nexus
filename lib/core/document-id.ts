// UUID and the legacy uid() fallback; never accept SQL pattern metacharacters.
export function validDocumentId(value:unknown):value is string {
 return typeof value==="string"&&(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)||/^\d{10,16}-[a-z0-9]{1,24}$/.test(value));
}
