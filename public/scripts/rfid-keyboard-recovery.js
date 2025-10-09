(() => {
  const DEFAULT_CONFIG = {
    selector: null,
    delay: 50,
    maxRetries: 3,
    enabled: true,
  };

  let config = { ...DEFAULT_CONFIG };

  const getTargetElement = () => {
    if (!config.enabled) {
      return null;
    }

    if (config.selector) {
      const el = document.querySelector(config.selector);
      if (el) {
        return el;
      }
      console.warn('[rfidRecovery] Element not found for selector:', config.selector);
    }

    const active = document.activeElement;
    if (active && active !== document.body) {
      return active;
    }

    console.warn('[rfidRecovery] No active element to receive ArrowRight events.');
    return null;
  };

  const getElementValue = (el) => {
    if (!el) return '';
    if ('value' in el) {
      return String(el.value ?? '');
    }
    return String(el.textContent ?? '');
  };

  const dispatchArrowRight = (target) => {
    const eventInit = {
      key: 'ArrowRight',
      code: 'ArrowRight',
      keyCode: 39,
      which: 39,
      bubbles: true,
      cancelable: true,
    };

    const downEvent = new KeyboardEvent('keydown', eventInit);
    target.dispatchEvent(downEvent);

    const upEvent = new KeyboardEvent('keyup', eventInit);
    target.dispatchEvent(upEvent);
  };

  const scheduleRecovery = () => {
    const target = getTargetElement();
    if (!target) {
      return;
    }

    const attemptRecovery = (attempt = 1) => {
      setTimeout(() => {
        if (!config.enabled) {
          return;
        }

        const beforeValue = getElementValue(target);
        dispatchArrowRight(target);

        setTimeout(() => {
          const afterValue = getElementValue(target);
          const changed = afterValue.length > beforeValue.length || afterValue !== beforeValue;

          if (changed || attempt >= config.maxRetries) {
            return;
          }

          attemptRecovery(attempt + 1);
        }, Math.max(10, config.delay / 2));
      }, config.delay);
    };

    attemptRecovery(1);
  };

  const handleKeydown = (event) => {
    if (!config.enabled) {
      return;
    }

    if (event.key === 'Enter') {
      scheduleRecovery();
    }
  };

  document.addEventListener('keydown', handleKeydown, true);

  const updateConfig = (newConfig = {}) => {
    if (typeof newConfig !== 'object' || newConfig === null) {
      console.warn('[rfidRecovery] Ignoring invalid configuration:', newConfig);
      return;
    }

    config = {
      ...config,
      ...Object.fromEntries(
        Object.entries(newConfig).filter(([key, value]) => value !== undefined)
      ),
    };

    if (typeof config.delay !== 'number' || config.delay < 0) {
      config.delay = DEFAULT_CONFIG.delay;
    }
    if (typeof config.maxRetries !== 'number' || config.maxRetries < 1) {
      config.maxRetries = DEFAULT_CONFIG.maxRetries;
    }
    if (typeof config.enabled !== 'boolean') {
      config.enabled = DEFAULT_CONFIG.enabled;
    }
  };

  const api = {
    enable() {
      config.enabled = true;
    },
    disable() {
      config.enabled = false;
    },
    update(configUpdate) {
      updateConfig(configUpdate);
    },
    getConfig() {
      return { ...config };
    },
    _triggerRecovery() {
      scheduleRecovery();
    },
  };

  updateConfig(DEFAULT_CONFIG);

  window.rfidRecoveryHelper = api;
})();
