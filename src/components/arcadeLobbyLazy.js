import lazyWithRetry from '../utils/lazyWithRetry';

/**
 * The arcade lobby as a lazy component, in its own module so the home portal can warm it
 * (ArcadeLobby.preload()) and PLAY swaps straight into it with no loading flash.
 */
const ArcadeLobby = lazyWithRetry(() => import('./ArcadeLobby'));

export default ArcadeLobby;
