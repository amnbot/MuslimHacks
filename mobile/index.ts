// Polyfills must load before the shared agreement module creates its TextEncoder
// and before any signing call reaches crypto.subtle.
import './src/polyfills';

import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
