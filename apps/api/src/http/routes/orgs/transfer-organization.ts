import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'

import { BadRequestError } from '../_errors/bad-request-error'
import { organizationSchema } from '@saas/auth'
import { UnauthorizedError } from '../_errors/unauthorizated-error'
import { getUserPermissions } from '@/utils/get-user-permissions'

export async function transferOrganization(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .patch(
      '/organizations:slug/ownwer',
      {
        schema: {
          tags: ['organizations'],
          summary: 'Transfer organization ownership',
          security: [{ bearerAuth: [] }],
          body: z.object({
            transferToUserId: z.string(),
          }),
          params: z.object({
            slug: z.string(),
          }),
          response: {
            204: z.null(),
            400: z.object({
              message: z.string(),
            }),
          },
        },
      },
      async (request, reply) => {
        const { slug } = request.params

        const userId = await request.getCurrentUserId()
        const { membership, organization } =
          await request.getUserMembership(slug)

        const { transferToUserId } = request.body

        const authOrganization = organizationSchema.parse({
          id: organization.id,
          ownerId: organization.ownerId,
        })

        const { cannot } = getUserPermissions(userId, membership.role)

        // Checa se o usuário que está transferindo a organização é o dono
        if (cannot('transfer_ownership', authOrganization)) {
          throw new UnauthorizedError(
            'You are not allowed to transfer ownership of this organization.'
          )
        }

        // Checa se o usuário que está sendo transferido é o dono da organização
        const transferToMembership = await prisma.member.findUnique({
          where: {
            organizationId_userId: {
              organizationId: organization.id,
              userId: transferToUserId,
            },
          },
        })

        if (!transferToMembership) {
          throw new BadRequestError(
            'The user you are trying to transfer ownership to is not a member of this organization.'
          )
        }

        // Atualiza os dados em conjunto por meio de uma transação
        // para garantir que ambas as operações sejam atômicas
        await prisma.$transaction([
          // Atualiza a role do usuário que recebendo a transferência
          prisma.member.update({
            where: {
              organizationId_userId: {
                organizationId: organization.id,
                userId: transferToUserId,
              },
            },
            data: {
              role: 'ADMIN',
            },
          }),
          // Atualiza a role do usuário que está transferindo a organização
          prisma.organization.update({
            where: {
              id: organization.id,
            },
            data: {
              ownerId: transferToUserId,
            },
          }),
        ])

        return reply.status(204).send()
      }
    )
}
