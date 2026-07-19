const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const documentId = 'cmrrc7b820001txx8h77tfiw0';
    // Let's see all shares for this document
    const shares = await prisma.documentShare.findMany({
      where: { document_id: documentId }
    });
    console.log("Current shares:", shares);
  } catch(e) {
    console.error(String(e));
  }
}
test();
