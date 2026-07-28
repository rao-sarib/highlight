/// <reference types="cypress" />

// Sample spec to confirm the Cypress setup works end-to-end.
// Replace / add your own suites under cypress/e2e/.
describe("Smoke", () => {
  it("loads the landing page", () => {
    cy.visit("/");
    cy.contains("Highlight").should("be.visible");
  });

  it("shows the login page", () => {
    cy.visit("/login");
    cy.contains(/sign in|log ?in/i).should("be.visible");
  });
});
