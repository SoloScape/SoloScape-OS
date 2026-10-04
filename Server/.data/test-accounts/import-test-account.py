"""Import the shared test character into an initialized server database."""

import argparse
import sqlite3
from pathlib import Path


def main():
    fixture_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "database", nargs="?", type=Path,
        default=fixture_dir.parent / "soloscape.db",
        help="Existing SQLite database (default: Server/.data/soloscape.db)",
    )
    args = parser.parse_args()
    database = args.database.resolve()
    if not database.is_file():
        parser.error("Database missing. Start the server once, then stop it before importing.")
    connection = sqlite3.connect(database.as_uri() + "?mode=rw", uri=True, timeout=10)
    try:
        connection.execute("PRAGMA foreign_keys=ON")
        connection.executescript((fixture_dir / "test.sql").read_text(encoding="utf-8"))
    except sqlite3.Error as error:
        connection.rollback()
        parser.exit(1, f"Import rolled back: {error}\nAn existing test account is never overwritten.\n")
    finally:
        connection.close()
    print("Imported test with 236 teleport item types, 100 of each. Original password preserved.")


if __name__ == "__main__":
    main()
