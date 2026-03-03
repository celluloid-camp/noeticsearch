import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { peertubeInstanceTable, userTable } from "@/db/schema";
import { env } from "@/env";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const DEFAULT_PEERTUBE_INSTANCES = [
  {
    title: "Public Peertube",
    host: "https://sepiasearch.org",
    thumbnail: "https://sepiasearch.org/theme/framasoft/img/title.svg",
    description: "Public PeerTube meta-search (SepiaSearch).",
    isIndex: true,
  },
  {
    title: "Celluloid",
    host: "https://celluloid.cloud",
    thumbnail:
      "https://celluloid.cloud/lazy-static/avatars/195e16ff-c0c2-4ccd-b3d7-3bfe09c55ffd.jpg",
    description: "Celluloid PeerTube instance.",
    isIndex: false,
  },
  {
    title: "MSH Paris Nord",
    host: "https://video.mshparisnord.fr",
    thumbnail:
      "https://video.mshparisnord.fr/lazy-static/avatars/c17d855c-e600-4c89-865d-89c13bb1d5ca.jpg",
    description: "MSH Paris Nord PeerTube instance.",
    isIndex: false,
  },
] as const;

async function seed() {
  const [existingAdmin] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, env.ADMIN_EMAIL))
    .limit(1);

  let adminUser = existingAdmin;

  if (!adminUser) {
    await auth.api.createUser({
      body: {
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
        name: "admin",
        role: "admin",
      },
    });

    const [createdAdmin] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, env.ADMIN_EMAIL))
      .limit(1);

    if (!createdAdmin) {
      throw new Error("Failed to create admin user via auth.api.createUser.");
    }

    adminUser = createdAdmin;
  }

  for (const instance of DEFAULT_PEERTUBE_INSTANCES) {
    const [existingInstance] = await db
      .select()
      .from(peertubeInstanceTable)
      .where(
        and(
          eq(peertubeInstanceTable.userId, adminUser.id),
          eq(peertubeInstanceTable.host, instance.host)
        )
      )
      .limit(1);

    if (existingInstance) {
      continue;
    }

    await db.insert(peertubeInstanceTable).values({
      id: createId(),
      userId: adminUser.id,
      host: instance.host,
      title: instance.title,
      description: instance.description,
      thumbnail: instance.thumbnail,
      isPublic: true,
      isIndex: instance.isIndex,
    });
  }
}

seed()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("Database seed completed.");
    process.exit(0);
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Database seed failed:", error);
    process.exit(1);
  });
