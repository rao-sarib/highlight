"""
Project ownership isolation.

The important property: one user must never be able to read, modify, or delete
another user's project. `_get_owned_project_or_404` deliberately returns 404
(not 403) for someone else's project, so the API doesn't leak whether a given
project id exists.
"""

from __future__ import annotations

import uuid


class TestUnauthenticatedAccess:
    def test_list_requires_a_token(self, client):
        assert client.get("/api/v1/projects/").status_code == 401

    def test_detail_requires_a_token(self, client):
        response = client.get(f"/api/v1/projects/{uuid.uuid4()}")
        assert response.status_code == 401

    def test_invalid_token_rejected(self, client):
        response = client.get(
            "/api/v1/projects/", headers={"Authorization": "Bearer not-a-real-token"}
        )
        assert response.status_code == 401

    def test_token_with_non_uuid_subject_is_401_not_500(self, client):
        """A validly-signed token whose `sub` isn't a UUID must not reach the DB."""
        from app.core.security import create_access_token

        token = create_access_token(subject="not-a-uuid")
        response = client.get(
            "/api/v1/projects/", headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 401


class TestOwnerAccess:
    def test_owner_can_read_own_project(self, client, make_user, make_project):
        owner, headers = make_user()
        project = make_project(owner)

        response = client.get(f"/api/v1/projects/{project.id}", headers=headers)

        assert response.status_code == 200
        assert response.json()["id"] == str(project.id)

    def test_list_only_returns_own_projects(self, client, make_user, make_project):
        owner, headers = make_user()
        other, _ = make_user()
        make_project(owner, name="Mine")
        make_project(other, name="Theirs")

        response = client.get("/api/v1/projects/", headers=headers)

        assert response.status_code == 200
        names = [item["name"] for item in response.json()]
        assert names == ["Mine"]


class TestCrossUserAccessIsBlocked:
    def test_cannot_read_another_users_project(self, client, make_user, make_project):
        owner, _ = make_user()
        _, attacker_headers = make_user()
        project = make_project(owner)

        response = client.get(f"/api/v1/projects/{project.id}", headers=attacker_headers)

        assert response.status_code == 404

    def test_cannot_update_another_users_project(self, client, make_user, make_project):
        owner, _ = make_user()
        _, attacker_headers = make_user()
        project = make_project(owner, name="Original")

        response = client.patch(
            f"/api/v1/projects/{project.id}",
            json={"name": "Hijacked"},
            headers=attacker_headers,
        )

        assert response.status_code == 404

    def test_cannot_delete_another_users_project(
        self, client, session, make_user, make_project
    ):
        from app.models.project import Project

        owner, _ = make_user()
        _, attacker_headers = make_user()
        project = make_project(owner)

        response = client.delete(f"/api/v1/projects/{project.id}", headers=attacker_headers)

        assert response.status_code == 404
        # Still there.
        assert session.get(Project, project.id) is not None

    def test_missing_project_returns_404(self, client, make_user):
        _, headers = make_user()
        response = client.get(f"/api/v1/projects/{uuid.uuid4()}", headers=headers)
        assert response.status_code == 404
