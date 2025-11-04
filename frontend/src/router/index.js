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
    path: '/jobs/:id/edit',
    name: 'job-edit',
    component: () => import('../views/jobs/JobCreate.vue'),
    props: true,
    meta: {
      requiresRole: 'dealer',
      breadcrumb: (route) => [
        { label: 'Jobs', to: '/jobs' },
        {
          label: route.params.id ? `Edit Job ${route.params.id}` : 'Edit Job'
        }
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
    path: '/dealer',
    name: 'dealer-dashboard',
    component: () => import('../views/dealer/DealerDashboard.vue'),
    meta: {
      breadcrumb: 'Dealer workspace',
      requiresRole: 'dealer'
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
    path: '/account',
    name: 'account-settings',
    component: () => import('../views/account/AccountSettings.vue'),
    meta: {
      breadcrumb: 'Account settings'
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
    path: '/profile/completed',
    name: 'profile-completed',
    component: () => import('../views/profile/ProfileCompletedJobs.vue'),
    meta: {
      breadcrumb: [
        { label: 'Profile', to: '/profile' },
        { label: 'Completed jobs' }
      ]
    }
  },
  {
    path: '/profile/membership',
    name: 'profile-membership',
    component: () => import('../views/profile/ProfileMembership.vue'),
    meta: {
      breadcrumb: [
        { label: 'Profile', to: '/profile' },
        { label: 'Membership' }
      ]
    }
  },
  {
    path: '/legal',
    name: 'legal',
    component: () => import('../views/legal/LegalView.vue'),
    meta: {
      breadcrumb: [
        { label: 'Profile', to: '/profile' },
        { label: 'Legal & compliance' }
      ]
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
        path: 'account-requests',
        name: 'admin-account-requests',
        component: () => import('../views/admin/AdminAccountRequests.vue'),
        meta: {
          breadcrumb: 'Account updates',
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
