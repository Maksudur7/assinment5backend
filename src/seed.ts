import bcrypt from "bcryptjs";
import prisma from "./lib/prisma";

async function main() {
  const adminPassword = await bcrypt.hash("admin123456", 10);

  await prisma.user.upsert({
    where: { email: "admin@ngv.local" },
    update: {},
    create: {
      name: "NGV Admin",
      email: "admin@ngv.local",
      emailVerified: true,
      passwordHash: adminPassword,
      role: "admin",
    },
  });

  const categories = [
    { name: "Action", icon: "bolt" },
    { name: "Thriller", icon: "zap" },
    { name: "Comedy", icon: "smile" },
    { name: "Drama", icon: "theater" },
    { name: "Sci-Fi", icon: "rocket" },
  ];

  for (const category of categories) {
    await prisma.category.upsert({ where: { name: category.name }, update: { icon: category.icon }, create: category });
  }

  const mediaItems = [
    {
      title: "The Dark Knight Returns",
      synopsis: "When evil rises, a hero must answer.",
      genres: ["Action", "Thriller"],
      releaseYear: 2024,
      director: "Christopher Nolan",
      cast: ["Actor 1", "Actor 2"],
      platforms: ["NGV"],
      pricing: "premium" as const,
      streamingUrl: "https://stream.ngv.com/dark-knight",
      poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba",
      duration: "2h 45m",
      popularity: 95,
    },
    {
      title: "Galaxy Drift",
      synopsis: "A sci-fi journey beyond known space.",
      genres: ["Sci-Fi", "Drama"],
      releaseYear: 2025,
      director: "A. Director",
      cast: ["Actor 3", "Actor 4"],
      platforms: ["NGV"],
      pricing: "premium" as const,
      streamingUrl: "https://stream.ngv.com/galaxy-drift",
      poster: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c",
      duration: "2h 10m",
      popularity: 88,
    },
    {
      title: "Laugh Out Loud",
      synopsis: "A heartwarming comedy for everyone.",
      genres: ["Comedy"],
      releaseYear: 2023,
      director: "C. Director",
      cast: ["Actor 5", "Actor 6"],
      platforms: ["NGV"],
      pricing: "free" as const,
      streamingUrl: "https://stream.ngv.com/lol",
      poster: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1",
      duration: "1h 50m",
      popularity: 70,
    },
  ];

  for (const item of mediaItems) {
    await prisma.media.upsert({ where: { streamingUrl: item.streamingUrl }, update: item, create: item });
  }
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
