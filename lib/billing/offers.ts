export const offers = {
  pro: { name: "NEXUS Pro", price: 249, allowance: 2_000_000 },
  plus: { name: "NEXUS Pro Plus", price: 499, allowance: 5_000_000 },
  extra: { name: "Ek kredi", price: 149, allowance: 1_500_000 },
} as const;
export type Offer = keyof typeof offers;
export const offerIds = Object.keys(offers) as Offer[];
