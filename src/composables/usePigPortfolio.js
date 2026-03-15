import { computed, ref } from 'vue';
import { getErrorMessage, pigsApi } from '@/api';
import { useAuth } from '@/stores/auth';

const DEFAULT_VALUE_PER_CLICK = 0.5;

const toFiniteNumber = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
};

const toClicks = (entry) => Number(entry?.clicks ?? entry?.count) || 0;

const toDateValue = (value) => {
    if (typeof value !== 'string' || !value) return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeNamesPayload = (payload) => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return {};
    }

    if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
        return payload.data;
    }

    return payload;
};

const buildPigMetrics = (pig, namesPayload, configPayload, currentUsername) => {
    const valuePerClick = toFiniteNumber(configPayload?.valuePerClick, toFiniteNumber(pig?.valuePerClick, DEFAULT_VALUE_PER_CLICK));
    const paypalLink = typeof configPayload?.paypalLink === 'string' ? configPayload.paypalLink.trim() : '';
    const memberEntries = Object.entries(normalizeNamesPayload(namesPayload))
        .filter(([, entry]) => entry && typeof entry === 'object')
        .map(([name, entry]) => {
            const clicks = toClicks(entry);
            const lastClickAt = typeof entry?.lastClickAt === 'string'
                ? entry.lastClickAt
                : (typeof entry?.lastClickedAt === 'string' ? entry.lastClickedAt : null);

            return {
                name,
                clicks,
                amount: clicks * valuePerClick,
                lastClickAt
            };
        })
        .sort((a, b) => b.clicks - a.clicks || a.name.localeCompare(b.name));

    const totalClicks = memberEntries.reduce((sum, member) => sum + member.clicks, 0);
    const totalAmount = totalClicks * valuePerClick;
    const ownEntry = memberEntries.find((member) => member.name === currentUsername) || null;
    const latestEntry = memberEntries
        .map((member) => ({ ...member, lastClickAtValue: toDateValue(member.lastClickAt) }))
        .filter((member) => member.lastClickAtValue !== null)
        .sort((a, b) => b.lastClickAtValue - a.lastClickAtValue)[0] || null;

    return {
        id: pig.id,
        title: pig.title || 'Phrasenschwein',
        role: pig.role || 'member',
        createdAt: pig.createdAt || null,
        createdBy: pig.createdBy || null,
        valuePerClick,
        paypalLink,
        memberEntries,
        memberCount: memberEntries.length,
        totalClicks,
        totalAmount,
        ownClicks: ownEntry?.clicks || 0,
        ownAmount: ownEntry?.amount || 0,
        topMember: memberEntries[0] || null,
        latestEntry
    };
};

export const usePigPortfolio = () => {
    const { username } = useAuth();

    const pigs = ref([]);
    const loading = ref(false);
    const refreshing = ref(false);
    const errorMessage = ref('');
    const lastUpdatedAt = ref(null);

    const refresh = async () => {
        errorMessage.value = '';
        const hasLoadedOnce = pigs.value.length > 0 || Boolean(lastUpdatedAt.value);
        if (hasLoadedOnce) {
            refreshing.value = true;
        } else {
            loading.value = true;
        }

        try {
            const payload = await pigsApi.listPigs();
            const listedPigs = Array.isArray(payload?.pigs) ? payload.pigs : [];

            const details = await Promise.all(
                listedPigs.map(async (pig) => {
                    const [namesResult, configResult] = await Promise.allSettled([
                        pigsApi.getNames(pig.id),
                        pigsApi.getConfig(pig.id)
                    ]);

                    const namesPayload = namesResult.status === 'fulfilled' ? namesResult.value : {};
                    const configPayload = configResult.status === 'fulfilled' ? configResult.value : {};
                    const metrics = buildPigMetrics(pig, namesPayload, configPayload, username.value || '');

                    return {
                        ...metrics,
                        partialError: namesResult.status === 'rejected' || configResult.status === 'rejected'
                    };
                })
            );

            pigs.value = details;
            lastUpdatedAt.value = new Date().toISOString();
        } catch (error) {
            errorMessage.value = getErrorMessage(error, 'Phrasenschwein-Daten konnten nicht geladen werden.');
        } finally {
            loading.value = false;
            refreshing.value = false;
        }
    };

    const summary = computed(() => {
        const totalClicks = pigs.value.reduce((sum, pig) => sum + pig.totalClicks, 0);
        const totalAmount = pigs.value.reduce((sum, pig) => sum + pig.totalAmount, 0);
        const ownClicks = pigs.value.reduce((sum, pig) => sum + pig.ownClicks, 0);
        const ownAmount = pigs.value.reduce((sum, pig) => sum + pig.ownAmount, 0);
        const memberSeats = pigs.value.reduce((sum, pig) => sum + pig.memberCount, 0);
        const adminPigs = pigs.value.filter((pig) => pig.role === 'admin').length;

        return {
            totalPigs: pigs.value.length,
            totalClicks,
            totalAmount,
            ownClicks,
            ownAmount,
            memberSeats,
            adminPigs
        };
    });

    const recentActivity = computed(() =>
        pigs.value
            .flatMap((pig) =>
                pig.memberEntries
                    .filter((member) => member.lastClickAt)
                    .map((member) => ({
                        pigId: pig.id,
                        pigTitle: pig.title,
                        name: member.name,
                        clicks: member.clicks,
                        amount: member.amount,
                        lastClickAt: member.lastClickAt,
                        lastClickAtValue: toDateValue(member.lastClickAt)
                    }))
            )
            .filter((entry) => entry.lastClickAtValue !== null)
            .sort((a, b) => b.lastClickAtValue - a.lastClickAtValue)
    );

    const memberLeaderboard = computed(() => {
        const byMember = new Map();

        pigs.value.forEach((pig) => {
            pig.memberEntries.forEach((member) => {
                const key = member.name;
                const current = byMember.get(key) || {
                    name: key,
                    clicks: 0,
                    amount: 0,
                    pigCount: 0
                };

                current.clicks += member.clicks;
                current.amount += member.amount;
                current.pigCount += 1;
                byMember.set(key, current);
            });
        });

        return Array.from(byMember.values()).sort((a, b) => b.amount - a.amount || b.clicks - a.clicks || a.name.localeCompare(b.name));
    });

    return {
        pigs,
        loading,
        refreshing,
        errorMessage,
        lastUpdatedAt,
        summary,
        recentActivity,
        memberLeaderboard,
        refresh
    };
};
