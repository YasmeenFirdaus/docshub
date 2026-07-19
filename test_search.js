const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const searchQuery = process.argv[2] || "admin";
  console.log(`Searching for: "${searchQuery}"`);

  let rankedMatches = await prisma.$queryRawUnsafe(`
    SELECT id, title, ts_rank(search_vector, websearch_to_tsquery('english', $1)) as rank
    FROM documents
    WHERE search_vector @@ websearch_to_tsquery('english', $1)
    ORDER BY rank DESC
    LIMIT 100
  `, searchQuery);
  
  console.log("FTS exact matches:", rankedMatches);

  if (rankedMatches.length === 0 && searchQuery.length > 2) {
    console.log("No exact matches found. Trying pg_trgm fuzzy matching...");
    rankedMatches = await prisma.$queryRawUnsafe(`
      SELECT id, title, GREATEST(similarity(coalesce(title, ''), $1), similarity(coalesce(content_text, ''), $1)) as rank
      FROM documents
      WHERE coalesce(title, '') % $1 OR coalesce(content_text, '') % $1
      ORDER BY rank DESC
      LIMIT 100
    `, searchQuery);
    console.log("pg_trgm fuzzy matches:", rankedMatches);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
