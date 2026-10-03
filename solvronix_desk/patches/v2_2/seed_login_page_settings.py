from solvronix_desk.setup import seed_login_page_settings


def execute():
    # Existing sites keep their current centered login until an admin opts in.
    seed_login_page_settings(layout="Centered Card")
