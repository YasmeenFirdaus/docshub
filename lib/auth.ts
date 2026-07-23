import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import * as bcrypt from "bcryptjs"
import { logActivity } from "./activity"

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  events: {
    async signIn({ user }) {
      void logActivity(user.id, "LOGIN", {
        operation: "LOGIN",
        resource_type: "USER",
        resource_id: user.id,
        resource_label: user.email ?? "Unknown",
        source: "System",
      })
    }
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user || user.status !== "ACTIVE") return null

        const isValid = await bcrypt.compare(credentials.password, user.password_hash)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as unknown as { role: string }).role

        const memberships = await prisma.workspaceMember.findMany({
          where: { user_id: user.id },
          include: {
            workspace: {
              include: {
                tenant: true,
              },
            },
          },
          orderBy: { joined_at: "asc" },
        })

        token.tenantId = memberships[0]?.workspace.tenant_id ?? null
        token.tenantName = memberships[0]?.workspace.tenant?.name ?? null
        token.workspaceIds = memberships.map((m) => m.workspace_id)
        token.activeWorkspaceId = memberships[0]?.workspace_id ?? null
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.tenantId = token.tenantId as string | null
        session.tenantName = token.tenantName as string | null
        session.workspaceIds = (token.workspaceIds as string[]) ?? []
        session.activeWorkspaceId = token.activeWorkspaceId as string | null
      }

      return session
    },
  },
}
