export const ROLES = Object.freeze({
    USER: 'user',
    ADMIN: 'admin'
});

const ROLE_ALIASES = Object.freeze({
    role_user: ROLES.USER,
    user: ROLES.USER,
    users: ROLES.USER,
    member: ROLES.USER,
    role_admin: ROLES.ADMIN,
    admin: ROLES.ADMIN,
    administrator: ROLES.ADMIN
});

const ROLE_HIERARCHY = Object.freeze({
    [ROLES.ADMIN]: [ROLES.USER]
});

const toRoleList = (input) => {
    if (Array.isArray(input)) {
        return input;
    }

    if (typeof input === 'string') {
        return [input];
    }

    return [];
};

const normalizeSingleRole = (role) => {
    const normalized = String(role || '').trim().toLowerCase();
    return ROLE_ALIASES[normalized] || normalized;
};

const expandWithHierarchy = (roleSet) => {
    const queue = [...roleSet];

    while (queue.length) {
        const currentRole = queue.shift();
        const inheritedRoles = ROLE_HIERARCHY[currentRole] || [];

        for (const inheritedRole of inheritedRoles) {
            if (roleSet.has(inheritedRole)) {
                continue;
            }

            roleSet.add(inheritedRole);
            queue.push(inheritedRole);
        }
    }

    return roleSet;
};

export const normalizeRolesWithHierarchy = (input, options = {}) => {
    const ensureBaseRole = Boolean(options.ensureBaseRole);
    const baseRole = normalizeSingleRole(options.baseRole || ROLES.USER);
    const normalized = toRoleList(input).map(normalizeSingleRole).filter(Boolean);
    const expandedRoles = expandWithHierarchy(new Set(normalized));

    if (ensureBaseRole && expandedRoles.size > 0 && !expandedRoles.has(baseRole)) {
        expandedRoles.add(baseRole);
    }

    return [...expandedRoles];
};

export const getRequiredRoles = (meta = {}) => {
    const required = meta.roles ?? meta.role ?? [];
    return normalizeRolesWithHierarchy(required, { ensureBaseRole: false });
};

export const hasAnyRequiredRole = (userRoles, requiredRoles) => {
    const normalizedRequiredRoles = normalizeRolesWithHierarchy(requiredRoles, { ensureBaseRole: false });
    if (!normalizedRequiredRoles.length) {
        return true;
    }

    const normalizedUserRoles = new Set(normalizeRolesWithHierarchy(userRoles, { ensureBaseRole: false }));
    return normalizedRequiredRoles.some((role) => normalizedUserRoles.has(role));
};

export const canAccessRoute = (meta, userRoles) => hasAnyRequiredRole(userRoles, getRequiredRoles(meta));
