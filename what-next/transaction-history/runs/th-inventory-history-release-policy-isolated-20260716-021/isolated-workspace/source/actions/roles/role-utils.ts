export const displayRoleName = (role: { nameEn: string; nameFr: string | null }) =>
  role.nameEn || role.nameFr || "";

export const displayUserName = (user: { firstName: string | null; lastName: string | null; email: string }) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

export const withDisplayRoleName = <T extends { nameEn: string; nameFr: string | null }>(role: T) => ({
  ...role,
  name: displayRoleName(role),
});
