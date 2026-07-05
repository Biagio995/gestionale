<script setup lang="ts">
import { computed, ref, watch } from 'vue';

export interface SidebarNavItem {
  to: string;
  label: string;
  active: boolean;
  badge?: number;
}

const props = defineProps<{
  title: string;
  items: SidebarNavItem[];
}>();

const open = ref(false);

const hasActiveChild = computed(() => props.items.some((item) => item.active));

watch(
  hasActiveChild,
  (active) => {
    if (active) open.value = true;
  },
  { immediate: true },
);

function toggle(): void {
  open.value = !open.value;
}
</script>

<template>
  <div class="nav-group" :class="{ open, 'has-active': hasActiveChild }">
    <button type="button" class="nav-group-toggle" :aria-expanded="open" @click="toggle">
      <span class="nav-group-title">{{ title }}</span>
      <span class="nav-group-chevron" aria-hidden="true">›</span>
    </button>
    <div v-show="open" class="nav-group-items">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        :class="{ active: item.active }"
      >
        {{ item.label }}
        <span v-if="item.badge && item.badge > 0" class="nav-badge">{{ item.badge }}</span>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.nav-group {
  display: flex;
  flex-direction: column;
}

.nav-group-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0.875rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--sidebar-muted);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.nav-group-toggle:hover,
.nav-group.has-active .nav-group-toggle {
  color: #fff;
}

.nav-group-chevron {
  font-size: 1rem;
  line-height: 1;
  transition: transform 0.15s;
  opacity: 0.7;
}

.nav-group.open .nav-group-chevron {
  transform: rotate(90deg);
}

.nav-group-items {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  margin-top: 0.125rem;
  padding-left: 0.375rem;
}

.nav-group-items a {
  color: var(--sidebar-muted);
  text-decoration: none;
  padding: 0.5rem 0.875rem;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: background 0.15s, color 0.15s;
}

.nav-group-items a:hover,
.nav-group-items a.active {
  background: var(--sidebar-active);
  color: #fff;
}

.nav-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.375rem;
  margin-left: 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  background: var(--primary);
  color: #fff;
  border-radius: 999px;
}
</style>
