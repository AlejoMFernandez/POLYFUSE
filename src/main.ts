/* ============================================================
   POLYFUSE · Entry point.
   ============================================================ */

import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';

import { boot } from './ui/app';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  boot(app);
} else {
  // eslint-disable-next-line no-console
  console.error('POLYFUSE: #app mount point not found.');
}
