import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'

import { getUserPermissions } from '@/utils/get-user-permissions'
import { UnauthorizedError } from '../_errors/unauthorizated-error'

export async function getProject(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/organizations/:orgSlug/projects/:projectSlug',
      {
        schema: {
          tags: ['projects'],
          summary: 'Get project details',
          security: [{ bearerAuth: [] }],
          params: z.object({
            orgSlug: z.string(),
            projectSlug: z.string(),
          }),
          response: {
            200: z.object({
              project: z.object({
                id: z.string().uuid(),
                description: z.string(),
                name: z.string(),
                slug: z.string(),
                avatarUrl: z.string().nullable(),
                organizationId: z.string().uuid(),
                ownerId: z.string().uuid(),
                owner: z.object({
                  id: z.string().uuid(),
                  name: z.string().nullable(),
                  avatarUrl: z.string().nullable(),
                }),
              }),
            }),
            400: z.object({
              message: z.string(),
            }),
          },
        },
      },
      async (request, reply) => {
        const { orgSlug, projectSlug } = request.params

        const userId = await request.getCurrentUserId()
        const { membership, organization } =
          await request.getUserMembership(orgSlug)

        const { cannot } = getUserPermissions(userId, membership)

        if (cannot('get', 'Project')) {
          throw new UnauthorizedError(
            'You are not allowed to see this project.'
          )
        }

        const project = await prisma.project.findUnique({
          where: {
            slug: projectSlug,
            organizationId: organization.id,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
            description: true,
            avatarUrl: true,
            organizationId: true,
            owner: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        })

        if (!project) {
          return reply.status(400).send({
            message:
              'Project not found. Please check the project ID and try again.',
          })
        }

        return reply.status(200).send({ project })
      }
    )
}
