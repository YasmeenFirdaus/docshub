const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const params = { id: 'cmrrc7b820001txx8h77tfiw0' };
    const shared_with = ['clx929239293']; // some random id to test the crash
    const permission = 'VIEW';
    const session = { user: { id: 'test_user_id' } };

    await prisma.$transaction(async (tx) => {
      await tx.documentShare.deleteMany({
        where: { document_id: params.id, permission }
      });
      await tx.documentShare.createMany({
        data: shared_with.map(userId => ({
          document_id: params.id,
          shared_with: userId,
          permission
        }))
      });
      await tx.activityLog.create({
        data: {
          user_id: session.user.id,
          action: 'DOCUMENT_SHARED',
          entity: 'document',
          entity_id: params.id,
          meta: { shared_with }
        }
      });
    });
    console.log('success');
  } catch(e) {
    console.error(String(e));
  }
}
test();
