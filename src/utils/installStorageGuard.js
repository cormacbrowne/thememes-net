// Side-effect module: imported first in main.jsx so the guard is in place before any other
// module (or React) touches localStorage. See storageGuard.js.
import { installStorageGuard } from './storageGuard.js';

installStorageGuard();
