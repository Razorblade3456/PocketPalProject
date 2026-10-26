export type Supply =
  | "food"
  | "water"
  | "soap"
  | "burger"
  | "pizza"
  | "cake"
  | "icecream"
  | "cookie"
  | "smoothie"
  | "pancakes";
export type Outfit =
  | "beanie"
  | "bowtie"
  | "scarf"
  | "backpack"
  | "mushroomHat"
  | "pajamas"
  | "crown"
  | "zombieSuit";
export type OutfitSlot = "head" | "neck" | "back" | "body";
export type ShopItem = Supply | Outfit;
export const SUPPLIES: Record<
  Supply,
  {
    name: string;
    shopName: string;
    price: number;
    category: "food" | "water" | "clean" | "happy";
    boost: number;
    morale: number;
    description: string;
    tab: "essentials" | "treats";
  }
> = {
  food: {
    name: "Food",
    shopName: "Basic Pet Food",
    price: 5,
    category: "food",
    boost: 15,
    morale: 4,
    description: "A nourishing little bowl for everyday adventures.",
    tab: "essentials",
  },
  water: {
    name: "Water",
    shopName: "Fresh Water",
    price: 4,
    category: "water",
    boost: 15,
    morale: 4,
    description: "A cool sip in a tiny handmade glass.",
    tab: "essentials",
  },
  soap: {
    name: "Soap",
    shopName: "Soft Cloud Soap",
    price: 6,
    category: "clean",
    boost: 15,
    morale: 4,
    description: "Gentle suds for soft paws and fresh stitches.",
    tab: "essentials",
  },
  burger: {
    name: "Cheeseburger",
    shopName: "Cheeseburger",
    price: 15,
    category: "food",
    boost: 25,
    morale: 5,
    description: "A miniature comfort-food masterpiece. Crumb approves.",
    tab: "treats",
  },
  pizza: {
    name: "Pizza Slice",
    shopName: "Pizza Slice",
    price: 18,
    category: "food",
    boost: 25,
    morale: 7,
    description: "Cheesy, cozy, and just a little wonky. Mochi’s favorite.",
    tab: "treats",
  },
  cake: {
    name: "Strawberry Cake",
    shopName: "Strawberry Cake",
    price: 20,
    category: "food",
    boost: 10,
    morale: 20,
    description: "Cloud-soft layers with a tiny strawberry. Pippin loves it.",
    tab: "treats",
  },
  icecream: {
    name: "Ice Cream",
    shopName: "Ice Cream",
    price: 12,
    category: "food",
    boost: 5,
    morale: 15,
    description: "A sweet little scoop for a happy little afternoon.",
    tab: "treats",
  },
  cookie: {
    name: "Cookie",
    shopName: "Chocolate Chip Cookie",
    price: 10,
    category: "food",
    boost: 5,
    morale: 10,
    description: "A pocket-sized hug with chocolate freckles.",
    tab: "treats",
  },
  smoothie: {
    name: "Fruit Smoothie",
    shopName: "Fruit Smoothie",
    price: 14,
    category: "water",
    boost: 10,
    morale: 10,
    description: "Berry-bright refreshment in a stitched little cup.",
    tab: "treats",
  },
  pancakes: {
    name: "Pancake Breakfast",
    shopName: "Pancake Breakfast",
    price: 22,
    category: "food",
    boost: 30,
    morale: 8,
    description: "A tiny stack made for a slow, lovely morning.",
    tab: "treats",
  },
};
export const OUTFITS: Record<
  Outfit,
  { name: string; price: number; slot: OutfitSlot; description: string }
> = {
  beanie: {
    name: "Tiny Beanie",
    price: 25,
    slot: "head",
    description: "Soft knitted warmth, finished with a fluffy pom-pom.",
  },
  bowtie: {
    name: "Red Bow Tie",
    price: 15,
    slot: "neck",
    description: "A little felt flourish for a very good little pal.",
  },
  scarf: {
    name: "Cozy Scarf",
    price: 30,
    slot: "neck",
    description: "Long, soft, and ready for tiny chilly adventures.",
  },
  backpack: {
    name: "Little Backpack",
    price: 40,
    slot: "back",
    description: "For acorns, daydreams, and very small treasures.",
  },
  mushroomHat: {
    name: "Mushroom Hat",
    price: 50,
    slot: "head",
    description: "A speckled woodland cap, stitched by imaginary fairies.",
  },
  pajamas: {
    name: "Pajamas",
    price: 60,
    slot: "body",
    description: "Starry bedtime fabric for the comfiest dreams.",
  },
  crown: {
    name: "Tiny Crown",
    price: 100,
    slot: "head",
    description: "A softly golden crown for the ruler of your heart.",
  },
  zombieSuit: {
    name: "Zombie Costume",
    price: 75,
    slot: "body",
    description: "Patchwork spooky playwear. Costume only, no health effect.",
  },
};
export const SUPPLY_IDS = Object.keys(SUPPLIES) as Supply[];
export const OUTFIT_IDS = Object.keys(OUTFITS) as Outfit[];
export const isSupply = (id: unknown): id is Supply =>
  typeof id === "string" && SUPPLY_IDS.includes(id as Supply);
export const isOutfit = (id: unknown): id is Outfit =>
  typeof id === "string" && OUTFIT_IDS.includes(id as Outfit);
export const emptyInventory = () =>
  Object.fromEntries(SUPPLY_IDS.map((id) => [id, 0])) as Record<Supply, number>;
export const itemName = (id: ShopItem) =>
  isSupply(id) ? SUPPLIES[id].shopName : OUTFITS[id].name;
export const favorites = {
  mochi: ["pizza", "icecream"],
  pippin: ["cake", "smoothie"],
  crumb: ["burger", "pancakes"],
} as const;
