const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Creating extension...');
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
  
  console.log('Creating index...');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS document_search_idx ON documents USING GIN (search_vector);');
  
  console.log('Backfilling...');
  const docs = await prisma.document.findMany({ select: { id: true } });
  for (const doc of docs) {
    await prisma.$executeRawUnsafe(`
      UPDATE documents d SET search_vector = 
        setweight(to_tsvector('english', coalesce(d.title, '')), 'A') || 
        setweight(to_tsvector('english', coalesce(d.file_name, '')), 'A') || 
        setweight(to_tsvector('english', coalesce((SELECT name FROM folders WHERE id = d.folder_id), '')), 'B') || 
        setweight(to_tsvector('english', coalesce((SELECT name FROM users WHERE id = d.owner_id), '')), 'B') || 
        setweight(to_tsvector('english', coalesce((SELECT string_agg(t.name, ' ') FROM tags t JOIN document_tags dt ON t.id = dt.tag_id WHERE dt.document_id = d.id), '')), 'B') || 
        setweight(to_tsvector('english', coalesce((SELECT string_agg(u.name, ' ') FROM users u JOIN document_shares ds ON u.id = ds.shared_with WHERE ds.document_id = d.id), '')), 'B') || 
        setweight(to_tsvector('english', coalesce((SELECT string_agg(u.name, ' ') FROM users u JOIN review_requests rr ON u.id = rr.reviewer_id WHERE rr.document_id = d.id), '')), 'B') || 
        setweight(to_tsvector('english', coalesce(d.content_text, '')), 'C') 
      WHERE id = '${doc.id}'
    `);
  }
  console.log('Done!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
