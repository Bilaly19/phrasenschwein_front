import { ROLES, normalizeRolesWithHierarchy } from './accessControl';

export const normalizeRoles = (input, options = {}) => {
    return normalizeRolesWithHierarchy(input, {
        ensureBaseRole: Boolean(options.ensureUser),
        baseRole: ROLES.USER
    });
};

export const resolveSessionRoles = (session) => {
    const rawRoles = session?.roles ?? session?.role ?? session?.user?.roles ?? session?.user?.role ?? [];
    return normalizeRoles(rawRoles, { ensureUser: true });
};
