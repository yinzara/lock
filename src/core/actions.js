import Immutable, { Map } from 'immutable';
import webApi from './web_api';
import { getEntity, read, removeEntity, swap, setEntity, updateEntity } from '../store/index';
import { syncRemoteData } from './remote_data';
import * as l from './index';
import { img as preload } from '../utils/preload_utils';
import { defaultProps } from '../ui/box/container';
import { isFieldValid, showInvalidField } from '../field/index';

export function setupLock(id, clientID, domain, options, logInCallback, hookRunner, emitEventFn) {
  // TODO: run a hook before initialization, useful for when we want
  // to provide some options by default.
  const m = syncRemoteData(l.setup(id, clientID, domain, options, logInCallback, hookRunner, emitEventFn));
  preload(l.ui.logo(m) || defaultProps.logo);


  webApi.setupClient(id, clientID, domain, l.withAuthOptions(m, {
    ...options,
    popupOptions: l.ui.popupOptions(m)
  }));


  swap(setEntity, "lock", id, m);

  // TODO: this triggers a second call to swap, maybe it can be
  // optimized. However, the Lock isn't rendering yet so it might not
  // be really an issue.
  l.runHook(m, "didInitialize", options);

  if (l.auth.redirect(m)) {
    const hash = webApi.parseHash(id);
    // TODO: this leaves the hash symbol (#) in the URL, maybe we can
    // use the history API instead to remove it.
    global.location.hash = "";

    let error, result;

    if (hash) {
      if (hash.error) {
        error = hash;
      } else {
        result = hash;
      }
    }

    setTimeout(() => l.invokeLogInCallback(m, error, result), 0);
  }

}

export function openLock(id) {
  const lock = read(getEntity, "lock", id);
  if (!lock) {
    throw new Error("The Lock can't be opened again after it has been destroyed");
  }

  if (l.rendering(lock)) {
    return false;
  }

  swap(updateEntity, "lock", id, l.render);

  return true;
}

export function closeLock(id, force = false, callback = () => {}) {
  // Do nothing when the Lock can't be closed, unless closing is forced.
  let lock = read(getEntity, "lock", id);
  if (!l.ui.closable(lock) && !force) {
    return;
  }

  // If it is a modal, stop rendering an reset after a second,
  // otherwise just reset.
  if (l.ui.appendContainer(lock)) {
    swap(updateEntity, "lock", id, l.stopRendering);

    setTimeout(() => {
      swap(updateEntity, "lock", id, l.reset);
      callback(read(getEntity, "lock", id));
    }, 1000);
  } else {
    swap(updateEntity, "lock", id, l.reset);
    callback(lock);
  }
}

export function removeLock(id) {
  swap(updateEntity, "lock", id, l.stopRendering);
  swap(removeEntity, "lock", id);
}

export function updateLock(id, f) {
  return swap(updateEntity, "lock", id, f);
}

export function pinLoadingPane(id) {
  const lock = read(getEntity, "lock", id);
  if (!lock.get("isLoadingPanePinned")) {
    swap(updateEntity, "lock", id, m => m.set("isLoadingPanePinned", true));
  }
}

export function unpinLoadingPane(id) {
  swap(updateEntity, "lock", id, m => m.set("isLoadingPanePinned", false));
}

function emitEvent(id, str, ...args) {
  l.emitEvent(read(getEntity, "lock", id), str, ...args);
}

export function startSubmit(id, fields = []) {
  swap(updateEntity, "lock", id, m => {
    const allFieldsValid = fields.reduce((r, x) => r && isFieldValid(m, x), true);
    return allFieldsValid
      ? l.setSubmitting(m, true)
      : fields.reduce((r, x) => showInvalidField(r, x), m);
  });

  const m = read(getEntity, "lock", id);
  return [l.submitting(m), m];
}

export function validateAndSubmit(id, fields = [], f) {
  swap(updateEntity, "lock", id, m => {
    const allFieldsValid = fields.reduce((r, x) => r && isFieldValid(m, x), true);
    return allFieldsValid
      ? l.setSubmitting(m, true)
      : fields.reduce((r, x) => showInvalidField(r, x), m);
  });

  const m = read(getEntity, "lock", id);
  if (l.submitting(m)) {
    f(m);
  }
}

export function logIn(id, fields, params = {}) {
  validateAndSubmit(id, fields, m => {
    webApi.logIn(id, params, (error, ...args) => {
      if (error) {
        setTimeout(() => logInError(id, error), 250);
      } else {
        logInSuccess(id, ...args);
      }
    });
  });
}


function logInSuccess(id, ...args) {
  const lock = read(getEntity, "lock", id);
  const autoclose = l.ui.autoclose(lock);

  if (!autoclose) {
    swap(updateEntity, "lock", id, lock => l.setSignedIn(l.setSubmitting(lock, false), true));
    l.invokeLogInCallback(lock, null, ...args);
  } else {
    closeLock(id, false, lock => l.invokeLogInCallback(lock, null, ...args));
  }
}

function logInError(id, error) {
  const lock = read(getEntity, "lock", id);
  const errorMessage = l.loginErrorMessage(lock, error);

  swap(updateEntity, "lock", id, l.setSubmitting, false, errorMessage);
  l.invokeLogInCallback(lock, error);
}
