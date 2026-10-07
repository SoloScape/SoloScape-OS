import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyLoginKey,
  LOGIN_PASSWORD_MAX_LENGTH,
  LOGIN_USERNAME_MAX_LENGTH,
} from './LoginInput';

test('routes typed characters to the selected login field', () => {
  const username = applyLoginKey(
    { username: 'barrow', password: '', selectedField: 'username' },
    's',
  );
  assert.equal(username.username, 'barrows');
  assert.equal(username.password, '');
  assert.equal(username.handled, true);

  const password = applyLoginKey(
    { ...username, selectedField: 'password' },
    'x',
  );
  assert.equal(password.username, 'barrows');
  assert.equal(password.password, 'x');
});

test('backspace edits the selected field', () => {
  const result = applyLoginKey(
    { username: 'barrows', password: 'abc', selectedField: 'password' },
    'Backspace',
  );
  assert.equal(result.username, 'barrows');
  assert.equal(result.password, 'ab');
  assert.equal(result.submit, false);
});

test('tab and enter follow the OSRS login field flow', () => {
  const tabbed = applyLoginKey(
    { username: 'barrows', password: '', selectedField: 'username' },
    'Tab',
  );
  assert.equal(tabbed.selectedField, 'password');

  const enterFromUsername = applyLoginKey(
    { username: 'barrows', password: '', selectedField: 'username' },
    'Enter',
  );
  assert.equal(enterFromUsername.selectedField, 'password');
  assert.equal(enterFromUsername.submit, false);

  const enterFromPassword = applyLoginKey(
    { username: 'barrows', password: 'secret', selectedField: 'password' },
    'Enter',
  );
  assert.equal(enterFromPassword.submit, true);
});

test('enforces desktop login field length limits', () => {
  const username = applyLoginKey(
    {
      username: 'u'.repeat(LOGIN_USERNAME_MAX_LENGTH),
      password: '',
      selectedField: 'username',
    },
    'x',
  );
  assert.equal(username.username.length, LOGIN_USERNAME_MAX_LENGTH);

  const password = applyLoginKey(
    {
      username: '',
      password: 'p'.repeat(LOGIN_PASSWORD_MAX_LENGTH),
      selectedField: 'password',
    },
    'x',
  );
  assert.equal(password.password.length, LOGIN_PASSWORD_MAX_LENGTH);
});

test('ignores characters outside the title-login character set', () => {
  const result = applyLoginKey(
    { username: '', password: '', selectedField: 'username' },
    '🙂',
  );
  assert.equal(result.handled, false);
  assert.equal(result.username, '');
});
