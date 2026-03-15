<script setup>
import { computed, onMounted } from 'vue';
import { usePigPortfolio } from '@/composables/usePigPortfolio';

const { pigs, loading, refreshing, errorMessage, summary, memberLeaderboard, recentActivity, refresh } = usePigPortfolio();

const formatMoney = (value) =>
    new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 2
    }).format(Number(value) || 0);

const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('de-DE');
};

const boardsByAmount = computed(() =>
    [...pigs.value].sort((a, b) => b.totalAmount - a.totalAmount || b.totalClicks - a.totalClicks)
);

const topMembers = computed(() => memberLeaderboard.value.slice(0, 12));

const recentActivityShort = computed(() => recentActivity.value.slice(0, 10));

const totalAmountSafe = computed(() => (summary.value.totalAmount > 0 ? summary.value.totalAmount : 1));
const totalClicksSafe = computed(() => (summary.value.totalClicks > 0 ? summary.value.totalClicks : 1));

const shareByAmount = (pigAmount) => Math.min(100, Math.round((pigAmount / totalAmountSafe.value) * 100));
const shareByClicks = (pigClicks) => Math.min(100, Math.round((pigClicks / totalClicksSafe.value) * 100));

onMounted(() => {
    void refresh();
});
</script>

<template>
    <div class="apple-scene p-2">
        <section class="apple-hero apple-reveal">
            <div class="min-w-0">
                <p class="apple-hero__eyebrow">Statistik</p>
                <h1 class="apple-hero__title">Kennzahlen und Trends</h1>
                <p class="apple-hero__subtitle">Transparente Auswertung zu Boards, Klick-Verteilung und Top-Mitgliedern.</p>
                <div class="apple-quick-stats">
                    <span class="apple-stat-pill">{{ summary.totalPigs }} Boards</span>
                    <span class="apple-stat-pill">{{ summary.memberSeats }} Mitglied-Slots</span>
                    <span class="apple-stat-pill">{{ formatMoney(summary.totalAmount) }} offen</span>
                </div>
            </div>
            <div class="apple-hero__actions">
                <Button
                    icon="pi pi-refresh"
                    label="Aktualisieren"
                    size="small"
                    class="apple-pill p-button-sm"
                    :loading="refreshing"
                    :disabled="loading || refreshing"
                    @click="refresh"
                />
            </div>
        </section>

        <Message v-if="errorMessage" severity="error" class="apple-banner mt-3">{{ errorMessage }}</Message>

        <div class="grid grid-cols-1 gap-3 mt-3 xl:grid-cols-2">
            <Panel header="Verteilung pro Board" class="apple-panel">
                <div v-if="loading" class="text-color-secondary">Laedt Statistik...</div>
                <div v-else-if="!boardsByAmount.length" class="text-color-secondary">Noch keine Daten vorhanden.</div>
                <div v-else class="flex flex-col gap-3">
                    <div v-for="pig in boardsByAmount" :key="pig.id" class="apple-stat-row">
                        <div class="flex items-center justify-between gap-2">
                            <p class="font-semibold truncate">{{ pig.title }}</p>
                            <Tag :value="pig.role === 'admin' ? 'Admin' : 'Mitglied'" :severity="pig.role === 'admin' ? 'success' : 'secondary'" class="text-xs" />
                        </div>
                        <div class="mt-2">
                            <div class="flex items-center justify-between text-xs text-color-secondary">
                                <span>Betrag {{ formatMoney(pig.totalAmount) }}</span>
                                <span>{{ shareByAmount(pig.totalAmount) }}%</span>
                            </div>
                            <div class="apple-progress-track mt-1">
                                <div class="apple-progress-fill" :style="{ width: `${shareByAmount(pig.totalAmount)}%` }"></div>
                            </div>
                        </div>
                        <div class="mt-2">
                            <div class="flex items-center justify-between text-xs text-color-secondary">
                                <span>Klicks {{ pig.totalClicks }}</span>
                                <span>{{ shareByClicks(pig.totalClicks) }}%</span>
                            </div>
                            <div class="apple-progress-track mt-1">
                                <div class="apple-progress-fill apple-progress-fill-soft" :style="{ width: `${shareByClicks(pig.totalClicks)}%` }"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </Panel>

            <Panel header="Top-Mitglieder (alle Boards)" class="apple-panel">
                <div v-if="loading" class="text-color-secondary">Laedt Mitglieder...</div>
                <div v-else-if="!topMembers.length" class="text-color-secondary">Noch keine Mitgliedsdaten.</div>
                <div v-else class="grid grid-cols-1 gap-2">
                    <Card v-for="member in topMembers" :key="member.name" class="apple-card">
                        <template #content>
                            <div class="flex items-center justify-between gap-2">
                                <p class="font-semibold truncate">@{{ member.name }}</p>
                                <Tag :value="`${member.clicks} Klicks`" severity="secondary" class="text-xs" />
                            </div>
                            <div class="mt-2 flex items-center justify-between text-sm">
                                <span class="text-color-secondary">{{ member.pigCount }} Boards</span>
                                <span class="font-semibold">{{ formatMoney(member.amount) }}</span>
                            </div>
                        </template>
                    </Card>
                </div>
            </Panel>
        </div>

        <Panel header="Letzte Klick-Aktivitaet" class="apple-panel mt-3">
            <div v-if="loading" class="text-color-secondary">Laedt Aktivitaet...</div>
            <div v-else-if="!recentActivityShort.length" class="text-color-secondary">Noch keine Klicks erfasst.</div>
            <div v-else class="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Card v-for="entry in recentActivityShort" :key="`${entry.pigId}-${entry.name}-${entry.lastClickAt}`" class="apple-card">
                    <template #content>
                        <p class="font-semibold truncate">{{ entry.name }} in {{ entry.pigTitle }}</p>
                        <p class="text-xs text-color-secondary mt-1">{{ formatDateTime(entry.lastClickAt) }}</p>
                        <div class="mt-2 flex items-center justify-between text-sm">
                            <Tag :value="`${entry.clicks} Klicks`" severity="secondary" class="text-xs" />
                            <span class="font-semibold">{{ formatMoney(entry.amount) }}</span>
                        </div>
                    </template>
                </Card>
            </div>
        </Panel>
    </div>
</template>
