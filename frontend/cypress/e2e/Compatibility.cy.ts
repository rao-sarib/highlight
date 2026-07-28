/// <reference types="cypress" />

// Compatibility Testing — wired to the real app + seeded account/project.
// The "Chrome/Firefox/Edge" cases are identical page checks; pick the browser at
// run time, e.g. `npx cypress run --browser firefox --spec cypress/e2e/Compatibility.cy.ts`.
describe("Compatibility Testing - Highlight AI SEO Tool", () => {
  beforeEach(() => {
    cy.fixture("testData").as("data");
  });

  // TC-1 Chrome Browser Compatibility
  it("TC-1 Chrome Browser Compatibility", () => {
    cy.visit("/");
    cy.contains("Highlight").should("be.visible");
  });

  // TC-2 Firefox Browser Compatibility
  it("TC-2 Firefox Browser Compatibility", () => {
    cy.visit("/");
    cy.contains("Start free").should("exist"); // fixed: "Start Free" -> "Start free"
  });

  // TC-3 Edge Browser Compatibility
  it("TC-3 Edge Browser Compatibility", () => {
    cy.visit("/");
    cy.get("body").should("be.visible");
  });

  // TC-4 Desktop Resolution Compatibility
  it("TC-4 Desktop Resolution Compatibility", () => {
    cy.viewport(1440, 900);
    cy.visit("/");
    cy.get("body").should("be.visible");
  });

  // TC-5 Tablet Resolution Compatibility
  it("TC-5 Tablet Resolution Compatibility", () => {
    cy.viewport("ipad-2");
    cy.visit("/");
    cy.get("body").should("be.visible");
  });

  // TC-6 Mobile Resolution Compatibility
  it("TC-6 Mobile Resolution Compatibility", () => {
    cy.viewport("iphone-x");
    cy.visit("/");
    cy.get("body").should("be.visible");
  });

  // TC-7 Dashboard Rendering Compatibility
  it("TC-7 Dashboard Rendering Compatibility", function () {
    cy.login(this.data.email, this.data.password);
    cy.contains("Dashboard").should("be.visible");
  });

  // TC-8 Forms Compatibility
  it("TC-8 Forms Compatibility", () => {
    cy.visit("/signup");
    cy.get("#full-name").type("Test User"); // fixed: input[name="name"] -> #full-name
    cy.get("#signup-email").type("test@gmail.com");
    cy.get("#signup-password").type("Test@123"); // fixed: target the first password field
    cy.contains("button", "Create account").should("exist"); // fixed: "Sign Up" -> "Create account"
  });

  // TC-9 Sidebar Navigation Compatibility
  it("TC-9 Sidebar Navigation Compatibility", function () {
    cy.openProject(); // sets an active project so the tool links are enabled
    cy.contains("a", "Analytics").click();
    cy.url().should("include", "/projects"); // fixed: Analytics lives at /projects/:id
  });

  // TC-10 AI Feature Compatibility
  it("TC-10 AI Feature Compatibility", function () {
    cy.login();
    cy.visit(`/projects/${this.data.projectId}/content-gen`);
    cy.contains("button", "Start workflow").click(); // blank topic -> auto keyword
    cy.contains(/generating your content/i, { timeout: 60000 }).should("be.visible");
  });

  // TC-11 Analytics Compatibility
  it("TC-11 Analytics Compatibility", function () {
    cy.openProject();
    cy.contains("a", "Analytics").click();
    cy.contains("SEO Health").should("be.visible");
    cy.get("svg").should("exist"); // fixed: charts/icons render as SVG (recharts), not <canvas>
  });

  // TC-12 Page Reload Compatibility
  it("TC-12 Page Reload Compatibility", function () {
    cy.login(this.data.email, this.data.password);
    cy.reload();
    cy.contains("Dashboard").should("be.visible");
  });
});
