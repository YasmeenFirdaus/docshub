import NextAuth from "next-auth"

declare module "next-auth" {

  interface Session {

    tenantId: string | null

    tenantName: string | null

    workspaceIds: string[]

    activeWorkspaceId: string | null

    user: {

      id: string

      role: string

      name?: string | null

      email?: string | null

      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {

  interface JWT {

    id: string

    role: string

    tenantId: string | null

    tenantName: string | null

    workspaceIds: string[]

    activeWorkspaceId: string | null
  }
}