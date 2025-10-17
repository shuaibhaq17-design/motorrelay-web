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
