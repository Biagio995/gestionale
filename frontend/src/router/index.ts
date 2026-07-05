import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'guest',
      component: () => import('@/modules/auth/GuestView.vue'),
      meta: { guest: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/modules/auth/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/modules/auth/RegisterView.vue'),
      meta: { guest: true },
    },
    {
      path: '/accept-invite',
      name: 'accept-invite',
      component: () => import('@/modules/auth/AcceptInviteView.vue'),
      meta: { guest: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/modules/auth/ForgotPasswordView.vue'),
      meta: { guest: true },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/modules/auth/ResetPasswordView.vue'),
      meta: { guest: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/modules/dashboard/DashboardView.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/tickets',
      name: 'tickets',
      component: () => import('@/modules/tickets/TicketsView.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/tickets/:id',
      name: 'ticket-detail',
      component: () => import('@/modules/tickets/TicketDetailView.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/crm/contacts',
      name: 'crm-contacts',
      component: () => import('@/modules/crm/ContactsView.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/crm/contacts/:id',
      name: 'crm-contact-detail',
      component: () => import('@/modules/crm/ContactDetailView.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/crm/deals',
      name: 'crm-deals',
      component: () => import('@/modules/crm/DealsView.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: () => import('@/modules/calendar/CalendarView.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/sales/pipeline',
      name: 'sales-pipeline',
      component: () => import('@/modules/sales/SalesPipelineView.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/sales/quotes',
      name: 'sales-quotes',
      component: () => import('@/modules/sales/QuotesView.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/sales/quotes/:id',
      name: 'sales-quote-detail',
      component: () => import('@/modules/sales/SalesDocumentDetail.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/sales/orders',
      name: 'sales-orders',
      component: () => import('@/modules/sales/OrdersView.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/sales/orders/:id',
      name: 'sales-order-detail',
      component: () => import('@/modules/sales/SalesDocumentDetail.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/sales/delivery-notes',
      name: 'sales-delivery-notes',
      component: () => import('@/modules/sales/DeliveryNotesView.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/sales/delivery-notes/:id',
      name: 'sales-delivery-note-detail',
      component: () => import('@/modules/sales/SalesDocumentDetail.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/sales/invoices',
      name: 'sales-invoices',
      component: () => import('@/modules/sales/InvoicesView.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/sales/invoices/:id',
      name: 'sales-invoice-detail',
      component: () => import('@/modules/sales/SalesDocumentDetail.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/sales/fiscal/settings',
      name: 'fiscal-settings',
      component: () => import('@/modules/fiscal/FiscalSettingsView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true, tenantOnly: true },
    },
    {
      path: '/sales/passive-invoices',
      name: 'passive-invoices',
      component: () => import('@/modules/fiscal/PassiveInvoicesView.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/sales/scadenzario',
      name: 'scadenzario',
      component: () => import('@/modules/fiscal/ScadenzarioView.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/items',
      name: 'items',
      component: () => import('@/modules/items/ItemsView.vue'),
      meta: { requiresAuth: true, tenantOnly: true },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/modules/users/UsersView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true, tenantOnly: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/modules/admin/AdminDashboardView.vue'),
      meta: { requiresAuth: true, requiresSuperAdmin: true },
    },
    {
      path: '/admin/companies',
      name: 'admin-companies',
      component: () => import('@/modules/admin/CompaniesView.vue'),
      meta: { requiresAuth: true, requiresSuperAdmin: true },
    },
    {
      path: '/admin/team',
      name: 'admin-team',
      component: () => import('@/modules/admin/AdminTeamView.vue'),
      meta: { requiresAuth: true, requiresSuperAdmin: true },
    },
    {
      path: '/admin/tickets',
      name: 'admin-tickets',
      component: () => import('@/modules/admin/AdminTicketsView.vue'),
      meta: { requiresAuth: true, requiresSuperAdmin: true },
    },
    {
      path: '/admin/tickets/:id',
      name: 'admin-ticket-detail',
      component: () => import('@/modules/admin/AdminTicketsView.vue'),
      meta: { requiresAuth: true, requiresSuperAdmin: true },
    },
    {
      path: '/admin/calendar',
      name: 'admin-calendar',
      component: () => import('@/modules/admin/AdminCalendarView.vue'),
      meta: { requiresAuth: true, requiresSuperAdmin: true },
    },
    {
      path: '/admin/contracts',
      name: 'admin-contracts',
      component: () => import('@/modules/admin/ContractsView.vue'),
      meta: { requiresAuth: true, requiresSuperAdmin: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

function defaultRoute(auth: ReturnType<typeof useAuthStore>): string {
  return auth.isSuperAdmin ? 'admin' : 'dashboard';
}

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (auth.token && !auth.user) {
    try {
      await auth.fetchMe();
    } catch {
      if (to.meta.requiresAuth) {
        return { name: 'login' };
      }
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' };
  }

  if (to.meta.requiresSuperAdmin && !auth.isSuperAdmin) {
    return { name: 'dashboard' };
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: defaultRoute(auth) };
  }

  if (to.meta.tenantOnly && auth.isSuperAdmin) {
    return { name: 'admin' };
  }

  if (to.meta.guest && auth.isAuthenticated) {
    return { name: defaultRoute(auth) };
  }

  return true;
});

export default router;
