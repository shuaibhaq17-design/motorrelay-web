import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/membership',
    name: 'membership',
    component: () => import('../views/membership/MembershipPlans.vue')
  },
  {
    path: '/jobs',
    name: 'jobs',
    component: () => import('../views/jobs/JobsIndex.vue')
  },
  {
    path: '/jobs/new',
    name: 'job-new',
    component: () => import('../views/jobs/JobCreate.vue')
  },
  {
    path: '/jobs/:id',
    name: 'job-detail',
    component: () => import('../views/jobs/JobDetail.vue'),
    props: true
  },
  {
    path: '/messages',
    name: 'messages',
    component: () => import('../views/messages/MessagesInbox.vue')
  },
  {
    path: '/planner',
    name: 'planner',
    component: () => import('../views/planner/PlannerDashboard.vue')
  },
  {
    path: '/invoices',
    name: 'invoices',
    component: () => import('../views/invoices/InvoicesIndex.vue')
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/profile/ProfileOverview.vue')
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/auth/LoginView.vue')
  },
  {
    path: '/signup',
    name: 'signup',
    component: () => import('../views/auth/SignupView.vue')
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
