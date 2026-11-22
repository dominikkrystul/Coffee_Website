export const tableIds = ["T1", "T2", "T3", "T4"] as const;
export type TableId = (typeof tableIds)[number];

export function isTableId(value: string): value is TableId {
  return tableIds.some((id) => id === value);
}

export type CoffeeProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
};

export const coffees = [
  {
    id: "espresso",
    name: "Espresso",
    description: "A rich, bold shot with a golden crema.",
    price: 250,
    image: "/coffee/espresso.jpg",
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    description: "Espresso with steamed milk and a cloud of foam.",
    price: 350,
    image: "/coffee/cappuccino.jpg",
  },
  {
    id: "latte",
    name: "Latte",
    description: "Mellow espresso with silky steamed milk.",
    price: 400,
    image: "/coffee/latte.jpg",
  },
  {
    id: "americano",
    name: "Americano",
    description: "Espresso lengthened with hot water.",
    price: 300,
    image: "/coffee/americano.jpg",
  },
] as const satisfies readonly CoffeeProduct[];

export function findCoffee(id: string) {
  return coffees.find((coffee) => coffee.id === id);
}

export function chf(rappen: number) {
  return `CHF ${(rappen / 100).toFixed(2)}`;
}
