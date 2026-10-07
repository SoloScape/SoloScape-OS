export type LoginInputField = 'username' | 'password';

export const LOGIN_USERNAME_MAX_LENGTH = 320;
export const LOGIN_PASSWORD_MAX_LENGTH = 20;

/**
 * Character set accepted by the desktop OSRS username/password title form.
 * Keep this deliberately narrower than arbitrary Unicode because the rev-240
 * login protocol serializes credentials as CP-1252 strings.
 */
const LOGIN_ALLOWED_CHARACTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
  '!"£$%^&*()-_=+[{]};:\'@#~,<.>/?\\| ';

export interface LoginInputState {
  readonly username: string;
  readonly password: string;
  readonly selectedField: LoginInputField;
}

export interface LoginKeyResult extends LoginInputState {
  readonly handled: boolean;
  readonly submit: boolean;
}

export function applyLoginKey(
  state: LoginInputState,
  key: string,
): LoginKeyResult {
  let username = state.username;
  let password = state.password;
  let selectedField = state.selectedField;
  let submit = false;

  if (key === 'Backspace') {
    if (selectedField === 'username') {
      username = username.slice(0, -1);
    } else {
      password = password.slice(0, -1);
    }
    return {
      username,
      password,
      selectedField,
      handled: true,
      submit,
    };
  }

  if (key === 'Tab') {
    selectedField =
      selectedField === 'username' ? 'password' : 'username';
    return {
      username,
      password,
      selectedField,
      handled: true,
      submit,
    };
  }

  if (key === 'Enter') {
    if (selectedField === 'username') {
      selectedField = 'password';
    } else {
      submit = true;
    }
    return {
      username,
      password,
      selectedField,
      handled: true,
      submit,
    };
  }

  if (
    key.length === 1 &&
    LOGIN_ALLOWED_CHARACTERS.includes(key)
  ) {
    if (
      selectedField === 'username' &&
      username.length < LOGIN_USERNAME_MAX_LENGTH
    ) {
      username += key;
    } else if (
      selectedField === 'password' &&
      password.length < LOGIN_PASSWORD_MAX_LENGTH
    ) {
      password += key;
    }

    return {
      username,
      password,
      selectedField,
      handled: true,
      submit,
    };
  }

  return {
    username,
    password,
    selectedField,
    handled: false,
    submit,
  };
}
