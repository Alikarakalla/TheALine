export type Review = {
  id: string;
  productId: string;
  rating: number; // 1..5
  title: string;
  body: string;
  author: string;
  createdAt: number;
};

// Static seed reviews, merged (not persisted) with user-written ones.
export const SEED_REVIEWS: Review[] = [
  { id: "s-terra-1", productId: "terra", rating: 5, title: "My everyday everything", body: "Holds my laptop, lunch and life. The leather has softened beautifully after a month.", author: "Camille R.", createdAt: 1_780_000_000_000 },
  { id: "s-terra-2", productId: "terra", rating: 4, title: "Roomy and elegant", body: "Bigger than expected in the best way. Wish the inner pocket were a touch deeper.", author: "Nadia K.", createdAt: 1_779_000_000_000 },
  { id: "s-terra-3", productId: "terra", rating: 5, title: "Worth it", body: "Quietly expensive looking. Compliments every week.", author: "Joële M.", createdAt: 1_778_000_000_000 },

  { id: "s-love-1", productId: "love-bag", rating: 5, title: "The one", body: "Took it from dinner to dancing. The chain is gorgeous.", author: "Priya S.", createdAt: 1_780_500_000_000 },
  { id: "s-love-2", productId: "love-bag", rating: 5, title: "Tiny but mighty", body: "Fits more than it looks. Obsessed.", author: "Lena V.", createdAt: 1_779_500_000_000 },

  { id: "s-amelie-1", productId: "amelie", rating: 4, title: "Clean lines", body: "Structured and smart for the office. Reads quietly expensive.", author: "Hana T.", createdAt: 1_780_200_000_000 },
  { id: "s-amelie-2", productId: "amelie", rating: 5, title: "Daily driver", body: "Strap length is perfect for crossbody. Holds shape all day.", author: "Marie D.", createdAt: 1_779_200_000_000 },

  { id: "s-belle-1", productId: "belle", rating: 5, title: "Confidence in a bag", body: "The bordeaux is rich and deep. Twist-lock feels solid.", author: "Sofia L.", createdAt: 1_780_800_000_000 },
  { id: "s-belle-2", productId: "belle", rating: 4, title: "Structured beauty", body: "Defined silhouette, holds its shape. A little firm at first.", author: "Eva P.", createdAt: 1_779_800_000_000 },

  { id: "s-mira-1", productId: "mira", rating: 5, title: "So soft", body: "Slouchy and effortless — moulds to me. Never feels like a statement.", author: "Aiko N.", createdAt: 1_780_300_000_000 },

  { id: "s-adele-1", productId: "adele", rating: 5, title: "Hands free, always", body: "Perfect mini for errands and travel. Cards fit neatly inside.", author: "Tess B.", createdAt: 1_780_400_000_000 },
  { id: "s-adele-2", productId: "adele", rating: 4, title: "Cute and capable", body: "Smaller than I imagined but holds the essentials well.", author: "Ruth A.", createdAt: 1_779_400_000_000 },
];
