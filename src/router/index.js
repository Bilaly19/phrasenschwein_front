import AppLayout from '@/layout/AppLayout.vue';
import { useAuth } from '@/stores/auth';
import { canAccessRoute, getRequiredRoles } from '@/utils/accessControl';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(),
    scrollBehavior() {
        return { top: 0 };
    },
    routes: [
        {
            path: '/',
            component: AppLayout,
            children: [
                {
                    path: '/',
                    redirect: '/phrasenschwein'
                },
                {
                    path: '/phrasenschwein',
                    name: 'phrasenschwein',
                    component: () => import('@/views/phrasenschwein/PhrasenschweinView.vue')
                },
                {
                    path: '/dashboard',
                    name: 'dashboard',
                    component: () => import('@/views/Dashboard.vue')
                },
                {
                    path: '/einstellungen',
                    name: 'einstellungen',
                    component: () => import('@/views/pages/Empty.vue')
                },
                {
                    path: '/statistik',
                    name: 'statistik',
                    component: () => import('@/views/pages/Empty.vue')
                },
                {
                    path: '/admin',
                    name: 'admin',
                    component: () => import('@/views/admin/AdminView.vue'),
                    meta: { roles: ['admin'] }
                },
                {
                    path: '/pages/empty',
                    name: 'empty',
                    component: () => import('@/views/pages/Empty.vue')
                },
                {
                    path: '/pages/crud',
                    name: 'crud',
                    component: () => import('@/views/pages/Crud.vue')
                },
                {
                    path: '/start/documentation',
                    name: 'documentation',
                    component: () => import('@/views/pages/Documentation.vue')
                }
            ]
        },
        {
            path: '/landing',
            name: 'landing',
            component: () => import('@/views/pages/Landing.vue')
        },
        {
            path: '/pages/notfound',
            name: 'notfound',
            component: () => import('@/views/pages/NotFound.vue')
        },
        {
            path: '/forbidden',
            name: 'forbidden',
            component: () => import('@/views/pages/Forbidden.vue')
        }
    ]
});

router.beforeEach((to) => {
    const { roles } = useAuth();
    const requiredRoles = getRequiredRoles(to.meta);

    if (!requiredRoles.length) {
        return true;
    }

    if (canAccessRoute(to.meta, roles.value)) {
        return true;
    }

    return {
        name: 'forbidden',
        query: {
            redirect: to.fullPath,
            required: requiredRoles.join(',')
        }
    };
});

export default router;
