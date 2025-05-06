import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'

import { getUserPermissions } from '@/utils/get-user-permissions'
import { UnauthorizedError } from '../_errors/unauthorizated-error'
import { BadRequestError } from '../_errors/bad-request-error'
import { projectSchema } from '@saas/auth'

export async function deleteProject(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .post(
      '/organizations/:slug/projects/:projectId',
      {
        schema: {
          tags: ['projects'],
          summary: 'Delete a project',
          security: [{ bearerAuth: [] }],
          params: z.object({
            projectId: z.string().uuid(),
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
        const { slug, projectId } = request.params

        const userId = await request.getCurrentUserId()
        const { membership, organization } =
          await request.getUserMembership(slug)

        const project = await prisma.project.findUnique({
          where: {
            id: projectId,
            organizationId: organization.id,
          },
        })

        if (!project) {
          throw new BadRequestError(
            'Project not found. Please check the project ID and try again.'
          )
        }

        const { cannot } = getUserPermissions(userId, membership)
        const authProject = await projectSchema.parse(project)

        if (cannot('delete', authProject)) {
          throw new UnauthorizedError(
            'You are not allowed to delete this project.'
          )
        }

        await prisma.project.delete({
          where: {
            id: project.id,
          },
        })

        return reply.status(204).send()
      }
    )
}
