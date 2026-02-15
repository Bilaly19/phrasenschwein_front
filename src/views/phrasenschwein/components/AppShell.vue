<template>
    <div class="flex flex-col gap-3">
        <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-2 min-w-0">
                <slot name="title" />
            </div>
            <div class="flex flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <slot name="actions" />
            </div>
        </header>

        <div class="flex flex-col gap-3 lg:flex-row">
            <aside v-if="$slots.sidebar" class="w-full lg:w-64">
                <slot name="sidebar" />
            </aside>
            <main class="flex-1 min-w-0">
                <slot />
            </main>
        </div>
    </div>
</template>
