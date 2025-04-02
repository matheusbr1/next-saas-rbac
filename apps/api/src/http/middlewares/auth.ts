import type { FastifyInstance } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'

import { UnauthorizedError } from '../routes/_errors/unauthorizated-error'

// O fastify plugin é utilizado para adicionar o hook abaixo em todo o contexto do app
// e não apenas em uma rota específica.
// Sem o fastify-plugin, o hook só funcionaria na rota em que ele foi definido

export const auth = fastifyPlugin(async (app: FastifyInstance) => {
  app.addHook('preHandler', async (request) => {
    request.getCurretUserId = async () => {
      try {
        // sub = subject
        // O sub é o id do usuário que está autenticado

        const { sub } = await request.jwtVerify<{ sub: string }>()

        return sub
      } catch {
        throw new UnauthorizedError('Invalid auth token')
      }
    }
  })
})
