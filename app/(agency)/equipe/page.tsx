import { UserType } from "@prisma/client";
import { TeamView } from "@/components/agency/team-view";
import {
  absenceKindLabel,
  formatAbsenceRange,
  isAbsentOn,
} from "@/lib/agency/absences";
import { requireAnyPermission } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import {
  listAbsences,
  listActiveAbsences,
} from "@/lib/services/absences.service";
import { inviteState, listInvites } from "@/lib/services/invites.service";
import { listRoles, listSectors } from "@/lib/services/settings.service";
import { listTeam } from "@/lib/services/users.service";

const INVITABLE_TYPES = Object.values(UserType).filter(
  (type) => type !== UserType.EXTERNAL_CLIENT
);

export default async function EquipePage() {
  const user = await requireAnyPermission("users.edit", "users.create");
  const canInvite = hasPermission(user.permissions, "users.create");
  const canManageAbsences = hasPermission(user.permissions, "users.edit");
  const now = new Date();
  const upcomingTo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 3, now.getUTCDate())
  );

  const [members, invites, roles, sectors, activeAbsences, upcomingAbsences] =
    await Promise.all([
      listTeam(),
      canInvite ? listInvites() : Promise.resolve([]),
      canInvite ? listRoles() : Promise.resolve([]),
      canInvite ? listSectors() : Promise.resolve([]),
      listActiveAbsences(now),
      listAbsences({ from: now, to: upcomingTo }),
    ]);

  const absenceByUser = new Map(
    activeAbsences.map((a) => [
      a.userId,
      {
        id: a.id,
        kind: a.kind,
        kindLabel: absenceKindLabel(a.kind),
        rangeLabel: formatAbsenceRange(a.startsAt, a.endsAt),
      },
    ])
  );

  function visibleNote(ownerId: string, note: string | null) {
    if (!note) return null;
    if (canManageAbsences || ownerId === user.id) return note;
    return null;
  }

  const upcoming = upcomingAbsences
    .filter((a) => !isAbsentOn(a, now) || a.startsAt > now)
    .slice(0, 20)
    .map((a) => ({
      id: a.id,
      userId: a.userId,
      userName: a.user.name,
      kindLabel: absenceKindLabel(a.kind),
      rangeLabel: formatAbsenceRange(a.startsAt, a.endsAt),
      note: visibleNote(a.userId, a.note),
      canCancel: a.userId === user.id || canManageAbsences,
    }));

  // Include today's absences in the list too (visible + cancelable)
  const todayRows = activeAbsences.map((a) => ({
    id: a.id,
    userId: a.userId,
    userName: a.user.name,
    kindLabel: absenceKindLabel(a.kind),
    rangeLabel: formatAbsenceRange(a.startsAt, a.endsAt),
    note: visibleNote(a.userId, a.note),
    canCancel: a.userId === user.id || canManageAbsences,
  }));

  const seen = new Set(todayRows.map((r) => r.id));
  const absencesList = [
    ...todayRows,
    ...upcoming.filter((r) => !seen.has(r.id)),
  ];

  return (
    <TeamView
      currentUserId={user.id}
      canInvite={canInvite}
      canRevoke={hasPermission(user.permissions, "users.deactivate")}
      canManageAbsences={canManageAbsences}
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
        absenceToday: absenceByUser.get(member.id) ?? null,
      }))}
      absences={absencesList}
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
