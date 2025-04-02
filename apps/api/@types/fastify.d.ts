import 'fastify'

declare module 'fastify' {
  export interface FastifyRequest {
    getCurretUserId: () => Promise<string>
  }
}
