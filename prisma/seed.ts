import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("Admin@123", 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "skillscafe" },
    update: {},
    create: {
      name: "SkillsCafe",
      slug: "skillscafe",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@dochub.com" },
    update: {},
    create: {
      email: "admin@dochub.com",
      name: "Yasmeen",
      password_hash: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const techTeam = await prisma.workspace.upsert({
    where: { slug: "tech-team" },
    update: {},
    create: {
      tenant_id: tenant.id,
      name: "Tech Team",
      description: "Default department space",
      slug: "tech-team",
      icon: "T",
    },
  });

  const learningWeaver = await prisma.folder.upsert({
    where: { id: "seed-learning-weaver" },
    update: {},
    create: {
      id: "seed-learning-weaver",
      name: "Learning Weaver",
      workspace_id: techTeam.id,
      parent_id: null,
      order: 0,
    },
  });

  await prisma.folder.upsert({
    where: { id: "seed-sops" },
    update: {},
    create: {
      id: "seed-sops",
      name: "SOPs",
      workspace_id: techTeam.id,
      parent_id: learningWeaver.id,
      order: 0,
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspace_id_user_id: {
        workspace_id: techTeam.id,
        user_id: admin.id,
      },
    },
    update: {},
    create: {
      workspace_id: techTeam.id,
      user_id: admin.id,
      role: "ADMIN",
    },
  });

  console.log(`Created tenant: ${tenant.name}`);
  console.log(`Created admin user: ${admin.email}`);
  console.log(`Created workspace/space: ${techTeam.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });