import { Routes } from '@angular/router';

/**
 * Three bottom tabs:
 *   /tabs/sleep       log overnight sleep (initial view: last night + bedtime button)
 *   /tabs/sleepiness  log Stanford Sleepiness Scale check-ins + reminders
 *   /tabs/history     view both kinds of data (chart + timeline)
 */
export const routes: Routes = [
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'sleep',
        loadComponent: () => import('./pages/sleep/sleep.page').then((m) => m.SleepPage),
      },
      {
        path: 'sleepiness',
        loadComponent: () => import('./pages/sleepiness/sleepiness.page').then((m) => m.SleepinessPage),
      },
      {
        path: 'history',
        loadComponent: () => import('./pages/history/history.page').then((m) => m.HistoryPage),
      },
      {
        path: '',
        redirectTo: '/tabs/sleep',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/sleep',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '/tabs/sleep',
  },
];
