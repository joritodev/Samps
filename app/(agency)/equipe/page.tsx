import { UserType } from "@prisma/client";
import { TeamView } from "@/components/agency/team-view";
import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import { inviteState, listInvites } from "@/lib/services/invites.service";
import { listRoles, listSectors } from "@/lib/services/settings.service";
import { listTeam } from "@/lib/services/users.service";

const INVITABLE_TYPES = Object.values(UserType).filter(
  (type) => type !== UserType.EXTERNAL_CLIENT
);

export default async function EquipePage() {
  const user = await requireAuth();
  const canInvite = hasPermission(user.permissions, "users.create");

  const [members, invites, roles, sectors] = await Promise.all([
    listTeam(),
    canInvite ? listInvites() : Promise.resolve([]),
    canInvite ? listRoles() : Promise.resolve([]),
    canInvite ? listSectors() : Promise.resolve([]),
  ]);

  return (
    <TeamView
      canInvite={canInvite}
      canRevoke={hasPermission(user.permissions, "users.deactivate")}
      userTypes={INVITABLE_TYPES}
      roles={roles.map((role) => ({ id: role.id, name: role.name }))}
      sectors={sectors.map((sector) => ({ id: sector.id, name: sector.name }))}
      members={members.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        userType: member.userType,
        roleName: member.role.name,
        sectorName: member.sector?.name ?? null,
        status: member.status,
      }))}
      invites={invites.map((invite) => ({
        id: invite.id,
        email: invite.user?.email ?? invite.email,
        invitedByName: invite.invitedBy.name,
        createdAt: invite.createdAt.toISOString(),
        expiresAt: invite.expiresAt.toISOString(),
        acceptedAt: invite.acceptedAt?.toISOString() ?? null,
        state: inviteState(invite),
      }))}
    />
  );
}
