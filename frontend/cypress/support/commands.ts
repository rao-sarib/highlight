/// <reference types="cypress" />

// ── Auth ───────────────────────────────────────────────────────────────────
// Logs in (cached with cy.session for speed) and lands on /dashboard.
// Credentials default to the seeded account in cypress.config.ts (Cypress.env).
Cypress.Commands.add("login", (email?: string, password?: string) => {
  const e = email ?? Cypress.env("email");
  const p = password ?? Cypress.env("password");
  cy.session(
    `user-${e}`,
    () => {
      cy.visit("/login");
      cy.get('input[type="email"]').type(e);
      cy.get('input[type="password"]').type(p, { log: false });
      cy.contains("button", "Sign in").click();
      cy.url({ timeout: 60000 }).should("include", "/dashboard");
    },
    { cacheAcrossSpecs: true },
  );
  cy.visit("/dashboard");
});

// Opens the seeded project so the project-scoped sidebar tools become enabled.
// Visiting the project URL makes it the active project (its layout sets it).
Cypress.Commands.add("openProject", () => {
  cy.login();
  cy.visit(`/projects/${Cypress.env("projectId")}/analysis`);
  cy.url().should("include", "/projects/");
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>;
      openProject(): Chainable<void>;
    }
  }
}

export {};
