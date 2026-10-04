> Historical build instructions: the build system has been removed. Commands below require a separately configured build system.

# Shared teleport testing account

`test.sql` contains the `test` account and its character save, including 100 of
each of 236 teleport item variants in the bank: jewellery and charge variants,
tablets, scrolls, teleport equipment, and the custom shooting-star tablet.
Some destinations and items still need implementation; their presence in the
bank lets testers check that behavior too.

The original password is preserved as a hash. Ask the repository owner for the
password to log in. This fixture includes only `test`; the live database and
other accounts remain ignored by Git.

## Import

1. From `Server/`, run `gradlew run` once to initialize `.data/soloscape.db`.
2. Stop the server before importing.
3. From `Server/`, run:

   ```sh
   python .data/test-accounts/import-test-account.py
   ```

4. Restart the server and log in as `test` using its original password. Visit a
   bank to withdraw the teleport items.

For a different SQLite path, pass it as the script's first argument. Imports
allocate new account and character IDs, preserve other accounts, and roll back
if `test` already exists. The local owner's account has already been stocked;
there is no need to import this fixture into that database.
