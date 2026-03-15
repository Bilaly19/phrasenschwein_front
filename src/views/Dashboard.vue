<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePigPortfolio } from '@/composables/usePigPortfolio';

const router = useRouter();
const { pigs, loading, refreshing, errorMessage, summary, recentActivity, refresh } = usePigPortfolio();

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

const topPigs = computed(() =>
    [...pigs.value]
        .sort((a, b) => b.totalAmount - a.totalAmount || b.totalClicks - a.totalClicks)
        .slice(0, 6)
);

const recentActivityShort = computed(() => recentActivity.value.slice(0, 8));

onMounted(() => {
    void refresh();
});
</script>

<template>
    <div class="apple-scene p-2">
        <section class="apple-hero apple-reveal">
            <div class="min-w-0">
                <p class="apple-hero__eyebrow">Dashboard</p>
                <h1 class="apple-hero__title">Live-Status deiner Phrasenschweine</h1>
                <p class="apple-hero__subtitle">Echte Kennzahlen aus allen Boards: Klicks, Betrag, letzte Aktivitaet und Top-Boards.</p>
                <div class="apple-quick-stats">
                    <span class="apple-stat-pill">{{ summary.totalPigs }} Boards</span>
                    <span class="apple-stat-pill">{{ summary.totalClicks }} Klicks gesamt</span>
                    <span class="apple-stat-pill">{{ formatMoney(summary.totalAmount) }} Gesamtwert</span>
                </div>
            </div>
            <div class="apple-hero__actions">
                <Button
                    icon="pi pi-wallet"
                    label="Zu meinen Boards"
                    severity="secondary"
                    size="small"
                    class="apple-pill p-button-sm"
                    @click="router.push({ name: 'pigs' })"
                />
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

        <div class="apple-metric-grid mt-3">
            <Panel header="Boards" class="apple-panel apple-metric apple-reveal apple-reveal-delay-1">
                <p class="apple-metric-number">{{ summary.totalPigs }}</p>
                <small class="text-color-secondary">davon {{ summary.adminPigs }} als Admin</small>
            </Panel>
            <Panel header="Klicks gesamt" class="apple-panel apple-metric apple-reveal apple-reveal-delay-2">
                <p class="apple-metric-number">{{ summary.totalClicks }}</p>
                <small class="text-color-secondary">ueber alle Boards</small>
            </Panel>
            <Panel header="Gesamtwert" class="apple-panel apple-metric apple-reveal apple-reveal-delay-3">
                <p class="apple-metric-number">{{ formatMoney(summary.totalAmount) }}</p>
                <small class="text-color-secondary">offener Betrag</small>
            </Panel>
        </div>

        <div class="grid grid-cols-1 gap-3 mt-3 lg:grid-cols-2">
            <Panel header="Top-Boards" class="apple-panel">
                <div v-if="loading" class="text-color-secondary">Laedt Dashboard...</div>
                <div v-else-if="!topPigs.length" class="text-color-secondary">Noch keine Boards vorhanden.</div>
                <div v-else class="grid grid-cols-1 gap-2">
                    <Card v-for="pig in topPigs" :key="pig.id" class="apple-card">
                        <template #content>
                            <div class="flex items-start justify-between gap-2">
                                <div class="min-w-0">
                                    <p class="font-semibold truncate">{{ pig.title }}</p>
                                    <p class="text-xs text-color-secondary mt-1">{{ pig.memberCount }} Mitglieder</p>
                                </div>
                                <Tag :value="pig.role === 'admin' ? 'Admin' : 'Mitglied'" :severity="pig.role === 'admin' ? 'success' : 'secondary'" class="text-xs" />
                            </div>
                            <div class="grid grid-cols-2 gap-2 mt-3 text-sm">
                                <div>
                                    <p class="text-color-secondary text-xs">Klicks</p>
                                    <p class="font-semibold">{{ pig.totalClicks }}</p>
                                </div>
                                <div>
                                    <p class="text-color-secondary text-xs">Betrag</p>
                                    <p class="font-semibold">{{ formatMoney(pig.totalAmount) }}</p>
                                </div>
                            </div>
                            <Button
                                class="mt-3 w-full apple-pill p-button-sm"
                                size="small"
                                icon="pi pi-arrow-right"
                                label="Board oeffnen"
                                @click="router.push({ name: 'pig', params: { pigId: pig.id } })"
                            />
                        </template>
                    </Card>
                </div>
            </Panel>

            <Panel header="Letzte Aktivitaet" class="apple-panel">
                <div v-if="loading" class="text-color-secondary">Laedt Aktivitaet...</div>
                <div v-else-if="!recentActivityShort.length" class="text-color-secondary">Noch keine Klick-Aktivitaet vorhanden.</div>
                <div v-else class="grid grid-cols-1 gap-2">
                    <Card v-for="entry in recentActivityShort" :key="`${entry.pigId}-${entry.name}-${entry.lastClickAt}`" class="apple-card">
                        <template #content>
                            <div class="flex items-start justify-between gap-2">
                                <div class="min-w-0">
                                    <p class="font-semibold truncate">{{ entry.name }} in {{ entry.pigTitle }}</p>
                                    <p class="text-xs text-color-secondary mt-1">{{ formatDateTime(entry.lastClickAt) }}</p>
                                </div>
                                <Tag :value="`${entry.clicks} Klicks`" severity="secondary" class="text-xs" />
                            </div>
                            <p class="text-sm mt-2">Aktueller Betrag: <span class="font-semibold">{{ formatMoney(entry.amount) }}</span></p>
                        </template>
                    </Card>
                </div>
            </Panel>
        </div>
    </div>
</template>
