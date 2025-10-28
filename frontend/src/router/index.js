import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: {
      breadcrumb: 'Home'
    }
  },
  {
    path: '/membership',
    name: 'membership',
    component: () => import('../views/membership/MembershipPlans.vue'),
    meta: {
      breadcrumb: 'Membership'
    }
  },
  {
    path: '/jobs',
    name: 'jobs',
    component: () => import('../views/jobs/JobsIndex.vue'),
    meta: {
      breadcrumb: 'Jobs'
    }
  },
  {
    path: '/jobs/new',
    name: 'job-new',
    component: () => import('../views/jobs/JobCreate.vue'),
    meta: {
      breadcrumb: [
        { label: 'Jobs', to: '/jobs' },
        { label: 'Create Job' }
      ]
    }
  },
  {
    path: '/jobs/:id',
    name: 'job-detail',
    component: () => import('../views/jobs/JobDetail.vue'),
    props: true,
    meta: {
      breadcrumb: (route) => [
        { label: 'Jobs', to: '/jobs' },
        {
          label: route.params.id ? `Job ${route.params.id}` : 'Job Detail'
        }
      ]
    }
  },
  {
    path: '/driver',
    name: 'driver-dashboard',
    component: () => import('../views/driver/DriverDashboard.vue'),
    meta: {
      breadcrumb: 'Driver workspace',
      requiresRole: 'driver'
    }
  },
  {
    path: '/messages',
    name: 'messages',
    component: () => import('../views/messages/MessagesInbox.vue'),
    meta: {
      breadcrumb: 'Messages'
    }
  },
  {
    path: '/planner',
    name: 'planner',
    component: () => import('../views/planner/PlannerDashboard.vue'),
    meta: {
      breadcrumb: 'Planner'
    }
  },
  {
    path: '/invoices',
    name: 'invoices',
    component: () => import('../views/invoices/InvoicesIndex.vue'),
    meta: {
      breadcrumb: 'Invoices'
    }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/profile/ProfileOverview.vue'),
    meta: {
      breadcrumb: 'Profile'
    }
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: {
      breadcrumb: 'Admin Portal',
      requiresRole: 'admin'
    },
    children: [
      {
        path: '',
        name: 'admin-overview',
        component: () => import('../views/admin/AdminOverview.vue'),
        meta: {
          breadcrumb: 'Overview',
          requiresRole: 'admin'
        }
      },
      {
        path: 'applications',
        name: 'admin-applications',
        component: () => import('../views/admin/AdminApplications.vue'),
        meta: {
          breadcrumb: 'Applications',
          requiresRole: 'admin'
        }
      },
      {
        path: 'conversations',
        name: 'admin-conversations',
        component: () => import('../views/admin/AdminConversations.vue'),
        meta: {
          breadcrumb: 'Conversations',
          requiresRole: 'admin'
        }
      },
      {
        path: 'plans',
        name: 'admin-plans',
        component: () => import('../views/admin/AdminPlans.vue'),
        meta: {
          breadcrumb: 'Plans & Billing',
          requiresRole: 'admin'
        }
      },
      {
        path: 'system-health',
        name: 'admin-system-health',
        component: () => import('../views/admin/AdminSystemHealth.vue'),
        meta: {
          breadcrumb: 'System Health',
          requiresRole: 'admin'
        }
      },
      {
        path: 'content',
        name: 'admin-content',
        component: () => import('../views/admin/AdminContent.vue'),
        meta: {
          breadcrumb: 'Content',
          requiresRole: 'admin'
        }
      }
    ]
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/auth/LoginView.vue'),
    meta: {
      breadcrumb: 'Login'
    }
  },
  {
    path: '/signup',
    name: 'signup',
    component: () => import('../views/auth/SignupView.vue'),
    meta: {
      breadcrumb: 'Sign up'
    }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

export default router;
