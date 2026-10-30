export const STATES = {
  LOADING: 'LOADING',
  IDLE: 'IDLE',
  DRAWING: 'DRAWING',
  SIMULATING: 'SIMULATING',
  WON: 'WON',
  FAILED: 'FAILED',
  PAUSED: 'PAUSED',
};

// Map of permitted state transitions
const VALID_TRANSITIONS = {
  [STATES.LOADING]: [STATES.IDLE],
  [STATES.IDLE]: [STATES.DRAWING, STATES.SIMULATING, STATES.PAUSED],
  [STATES.DRAWING]: [STATES.IDLE, STATES.SIMULATING, STATES.PAUSED],
  [STATES.SIMULATING]: [STATES.DRAWING, STATES.WON, STATES.FAILED, STATES.PAUSED, STATES.IDLE],
  [STATES.PAUSED]: [STATES.IDLE, STATES.DRAWING, STATES.SIMULATING],
  [STATES.WON]: [STATES.IDLE], // only via reset
  [STATES.FAILED]: [STATES.IDLE], // only via reset
};

export class GameState {
  constructor(initialState = STATES.IDLE) {
    this.state = initialState;
    this.previousState = null;

    this.callbacks = {
      onStateChange: [],
      onFill: [],
      onWin: [],
      onFail: [],
    };
  }

  get current() {
    return this.state;
  }

  is(stateName) {
    return this.state === stateName;
  }

  transitionTo(nextState, payload = {}) {
    if (this.state === nextState) return false;

    const allowed = VALID_TRANSITIONS[this.state] || [];
    if (!allowed.includes(nextState)) {
      console.warn(`[GameState] Invalid transition attempted from ${this.state} to ${nextState}`);
      return false;
    }

    const prevState = this.state;
    this.previousState = prevState;
    this.state = nextState;

    this.emit('onStateChange', { current: nextState, previous: prevState, payload });

    if (nextState === STATES.WON) {
      this.emit('onWin', payload);
    } else if (nextState === STATES.FAILED) {
      this.emit('onFail', payload);
    }

    return true;
  }

  onStateChange(fn) {
    this.callbacks.onStateChange.push(fn);
    return () => {
      this.callbacks.onStateChange = this.callbacks.onStateChange.filter((cb) => cb !== fn);
    };
  }

  onFill(fn) {
    this.callbacks.onFill.push(fn);
    return () => {
      this.callbacks.onFill = this.callbacks.onFill.filter((cb) => cb !== fn);
    };
  }

  onWin(fn) {
    this.callbacks.onWin.push(fn);
    return () => {
      this.callbacks.onWin = this.callbacks.onWin.filter((cb) => cb !== fn);
    };
  }

  onFail(fn) {
    this.callbacks.onFail.push(fn);
    return () => {
      this.callbacks.onFail = this.callbacks.onFail.filter((cb) => cb !== fn);
    };
  }

  notifyFill(data) {
    this.emit('onFill', data);
  }

  emit(event, data) {
    const list = this.callbacks[event] || [];
    for (let i = 0; i < list.length; i++) {
      try {
        list[i](data);
      } catch (err) {
        console.error(`[GameState] Error in ${event} listener:`, err);
      }
    }
  }

  reset() {
    this.previousState = null;
    this.state = STATES.IDLE;
    this.emit('onStateChange', { current: STATES.IDLE, previous: null });
  }

  destroy() {
    this.callbacks = {
      onStateChange: [],
      onFill: [],
      onWin: [],
      onFail: [],
    };
  }
}
