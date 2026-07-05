<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAdminStore } from '@/stores/admin';
import { usePolling } from '@/composables/usePolling';
import LanguageSwitcher from './LanguageSwitcher.vue';
import SidebarNavGroup, { type SidebarNavItem } from './SidebarNavGroup.vue';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const admin = useAdminStore();

onMounted(async () => {
  if (auth.isSuperAdmin) {
    try {
      await refreshAdminBadges();
    } catch {
      /* sidebar badge is optional */
    }
  }
});

async function refreshAdminBadges(): Promise<void> {
  await admin.loadStats();
}

usePolling(
  async () => {
    if (!auth.isSuperAdmin) return;
    try {
      await refreshAdminBadges();
    } catch {
      /* background refresh */
    }
  },
  { intervalMs: 10_000, enabled: () => auth.isSuperAdmin },
);

function logout(): void {
  auth.logout();
  router.push({ name: 'guest' });
}

function isActive(name: string): boolean {
  return route.name === name;
}

const crmNavItems = computed<SidebarNavItem[]>(() => [
  {
    to: '/crm/contacts',
    label: t('nav.contacts'),
    active: isActive('crm-contacts') || isActive('crm-contact-detail'),
  },
  {
    to: '/crm/deals',
    label: t('nav.deals'),
    active: isActive('crm-deals'),
  },
]);

const salesNavItems = computed<SidebarNavItem[]>(() => {
  const items: SidebarNavItem[] = [
    {
      to: '/sales/pipeline',
      label: t('nav.pipeline'),
      active: route.path.startsWith('/sales/pipeline'),
    },
    {
      to: '/sales/quotes',
      label: t('nav.quotes'),
      active: route.path.startsWith('/sales/quotes'),
    },
    {
      to: '/sales/orders',
      label: t('nav.orders'),
      active: route.path.startsWith('/sales/orders'),
    },
    {
      to: '/sales/delivery-notes',
      label: t('nav.deliveryNotes'),
      active: route.path.startsWith('/sales/delivery-notes'),
    },
    {
      to: '/sales/invoices',
      label: t('nav.invoices'),
      active: route.path.startsWith('/sales/invoices'),
    },
    {
      to: '/sales/passive-invoices',
      label: t('nav.passiveInvoices'),
      active: isActive('passive-invoices'),
    },
    {
      to: '/sales/scadenzario',
      label: t('nav.scadenzario'),
      active: isActive('scadenzario'),
    },
  ];
  if (auth.isAdmin) {
    items.push({
      to: '/sales/fiscal/settings',
      label: t('nav.fiscalSettings'),
      active: isActive('fiscal-settings'),
    });
  }
  return items;
});

const workspaceNavItems = computed<SidebarNavItem[]>(() => [
  {
    to: '/items',
    label: t('nav.items'),
    active: isActive('items'),
  },
  {
    to: '/calendar',
    label: t('nav.calendar'),
    active: isActive('calendar'),
  },
  {
    to: '/tickets',
    label: t('nav.tickets'),
    active: isActive('tickets') || isActive('ticket-detail'),
  },
]);

const platformNavItems = computed<SidebarNavItem[]>(() => [
  {
    to: '/admin/companies',
    label: t('nav.companies'),
    active: isActive('admin-companies'),
  },
  {
    to: '/admin/team',
    label: t('nav.team'),
    active: isActive('admin-team'),
  },
]);

const operationsNavItems = computed<SidebarNavItem[]>(() => [
  {
    to: '/admin/tickets',
    label: t('nav.supportInbox'),
    active: isActive('admin-tickets') || isActive('admin-ticket-detail'),
    badge: admin.unreadCount,
  },
  {
    to: '/admin/calendar',
    label: t('nav.calendar'),
    active: isActive('admin-calendar'),
  },
  {
    to: '/admin/contracts',
    label: t('nav.contracts'),
    active: isActive('admin-contracts'),
    badge: admin.expiringContractsCount,
  },
]);
</script>

<template>
  <div class="app-shell">
    <aside v-if="auth.isAuthenticated" class="sidebar">
      <div class="sidebar-brand">{{ t('app.title') }}</div>

      <nav class="sidebar-nav">
        <template v-if="auth.isSuperAdmin">
          <RouterLink to="/admin" :class="{ active: isActive('admin') }">
            {{ t('nav.dashboard') }}
          </RouterLink>

          <SidebarNavGroup :title="t('nav.groups.management')" :items="platformNavItems" />

          <SidebarNavGroup :title="t('nav.groups.operations')" :items="operationsNavItems" />
        </template>

        <template v-else>
          <RouterLink to="/dashboard" :class="{ active: isActive('dashboard') }">
            {{ t('nav.dashboard') }}
          </RouterLink>

          <SidebarNavGroup :title="t('nav.groups.crm')" :items="crmNavItems" />

          <SidebarNavGroup :title="t('nav.groups.sales')" :items="salesNavItems" />

          <SidebarNavGroup :title="t('nav.groups.workspace')" :items="workspaceNavItems" />

          <RouterLink
            v-if="auth.isAdmin"
            to="/users"
            :class="{ active: isActive('users') }"
          >
            {{ t('nav.users') }}
          </RouterLink>
        </template>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <span class="user-email">{{ auth.user?.email }}</span>
          <span class="user-role">{{ auth.user?.role }}</span>
        </div>
        <LanguageSwitcher />
        <button type="button" class="btn btn-ghost btn-block" @click="logout">
          {{ t('nav.logout') }}
        </button>
      </div>
    </aside>

    <div class="main-area">
      <header v-if="!auth.isAuthenticated" class="top-header">
        <div class="brand">{{ t('app.title') }}</div>
        <LanguageSwitcher />
      </header>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
}

.sidebar {
  width: 260px;
  background: var(--sidebar);
  color: var(--sidebar-text);
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  flex-shrink: 0;
}

.sidebar-brand {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 2rem;
  color: #fff;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1;
}

.sidebar-nav > a {
  color: var(--sidebar-muted);
  text-decoration: none;
  padding: 0.625rem 0.875rem;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: background 0.15s, color 0.15s;
}

.sidebar-nav > a:hover,
.sidebar-nav > a.active {
  background: var(--sidebar-active);
  color: #fff;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.user-email {
  font-size: 0.8rem;
  color: #fff;
  word-break: break-all;
}

.user-role {
  font-size: 0.7rem;
  color: var(--sidebar-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-block {
  width: 100%;
  justify-content: center;
  color: var(--sidebar-muted);
}

.btn-block:hover {
  color: #fff;
  background: var(--sidebar-active);
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.top-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.brand {
  font-weight: 700;
  font-size: 1.125rem;
}
</style>
