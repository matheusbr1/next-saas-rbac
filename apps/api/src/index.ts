import { ability } from '@saas/auth'

const userCanInviteSomeoneElse = ability.can('invite', 'User')
const userCanDeleteSomeUser = ability.can('delete', 'User')

console.log(userCanInviteSomeoneElse)
console.log(userCanDeleteSomeUser)
