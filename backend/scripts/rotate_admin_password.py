"""
Rotate the /adminpanel admin password.

Why this script exists: the admin account is seeded into the database only when
no admin row exists yet (see `_seed_initial_data` in app/main.py). Changing
ADMIN_PASSWORD in the environment therefore has NO effect on an account that
was already created — the stored bcrypt hash has to be rewritten directly, and
there is no password-change endpoint on the admin API.

Usage (from backend/, with the virtualenv active):

    python scripts/rotate_admin_password.py                 # reads ADMIN_PASSWORD from env/.env
    python scripts/rotate_admin_password.py --password '...' # or pass it explicitly
    python scripts/rotate_admin_password.py --username admin --password '...'

Inside Docker:

    docker compose exec backend python scripts/rotate_admin_password.py --password '...'

The new password is never printed back out.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Allow running as a plain script from the backend/ directory.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session, select  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.models.admin import Admin  # noqa: E402

MIN_LENGTH = 12
# Values that were public in the repository's history — refuse to set them again.
KNOWN_WEAK = {"highlight-admin", "admin", "password", "changeme"}


def main() -> int:
    parser = argparse.ArgumentParser(description="Rotate an admin panel password.")
    parser.add_argument(
        "--username",
        default=None,
        help="Admin username to update (default: ADMIN_USERNAME, else the only admin).",
    )
    parser.add_argument(
        "--password",
        default=None,
        help="New password (default: read from the ADMIN_PASSWORD environment variable).",
    )
    args = parser.parse_args()

    new_password = args.password or settings.ADMIN_PASSWORD.strip()
    if not new_password:
        print(
            "ERROR: no password given. Pass --password or set ADMIN_PASSWORD.",
            file=sys.stderr,
        )
        return 2
    if len(new_password) < MIN_LENGTH:
        print(f"ERROR: password must be at least {MIN_LENGTH} characters.", file=sys.stderr)
        return 2
    if new_password.lower() in KNOWN_WEAK:
        print(
            "ERROR: that password was published in this repository's git history. "
            "Choose a new one.",
            file=sys.stderr,
        )
        return 2

    with Session(engine) as session:
        admins = session.exec(select(Admin)).all()
        if not admins:
            print(
                "No admin account exists yet. Set ADMIN_PASSWORD and start the "
                "backend — it will be seeded on startup.",
                file=sys.stderr,
            )
            return 1

        username = args.username or settings.ADMIN_USERNAME.strip()
        target = next((a for a in admins if a.username == username), None)
        if target is None:
            if len(admins) == 1:
                target = admins[0]
            else:
                names = ", ".join(sorted(a.username for a in admins))
                print(
                    f"ERROR: no admin named '{username}'. Existing admins: {names}. "
                    "Re-run with --username.",
                    file=sys.stderr,
                )
                return 1

        target.hashed_password = hash_password(new_password)
        session.add(target)
        session.commit()
        print(f"Password rotated for admin '{target.username}'.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
