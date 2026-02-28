import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'

export const isGitHubOAuthConfigured = Boolean(
  process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
)

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: isGitHubOAuthConfigured
    ? [
        GitHub({
          clientId: process.env.AUTH_GITHUB_ID!,
          clientSecret: process.env.AUTH_GITHUB_SECRET!,
          authorization: { params: { scope: 'repo read:user' } },
        }),
      ]
    : [],
  callbacks: {
    jwt({ token, account, profile }) {
      if (account?.access_token) {
        return {
          ...token,
          accessToken: account.access_token,
          username: (profile as { login?: string })?.login ?? '',
          avatarUrl: (profile as { avatar_url?: string })?.avatar_url ?? '',
        }
      }
      return token
    },
    session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken as string,
        user: {
          ...session.user,
          username: token.username as string,
          avatarUrl: token.avatarUrl as string,
        },
      }
    },
  },
})
