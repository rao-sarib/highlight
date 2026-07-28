/// <reference types="cypress" />

// Functional Testing — wired to the real app + seeded verified account/project.
describe("Functional Testing - Highlight AI SEO Tool", () => {
  beforeEach(() => {
    cy.fixture("testData").as("data");
  });

  // TC-1 Landing Page Load
  it("TC-1 Landing Page Load", () => {
    cy.visit("/");
    cy.contains("Highlight").should("be.visible");
  });

  // TC-2 Get Started Navigation
  it("TC-2 Get Started Navigation", () => {
    cy.visit("/");
    cy.contains("a", "Start free").click(); // the header CTA link (not other "Start free" text)
    cy.url().should("include", "/signup");
  });

  // TC-3 User Signup
  it("TC-3 User Signup", () => {
    const email = `newuser_${Date.now()}@gmail.com`;
    cy.visit("/signup");
    cy.get("#full-name").type("Test User");
    cy.get("#signup-email").type(email);
    cy.get("#signup-password").type("Test@1234");
    cy.get("#confirm-password").type("Test@1234");
    cy.contains("button", "Create account").click();
    cy.contains("Check your email").should("be.visible");
  });

  // TC-4 User Login
  it("TC-4 User Login", function () {
    cy.login(this.data.email, this.data.password);
    cy.url().should("include", "/dashboard");
  });

  // TC-5 Dashboard Display
  it("TC-5 Dashboard Display", function () {
    cy.login(this.data.email, this.data.password);
    cy.contains("Dashboard").should("be.visible");
  });

  // TC-6 Sidebar Navigation
  it("TC-6 Sidebar Navigation", function () {
    cy.openProject(); // sets an active project so the tool links are enabled
    cy.contains("a", "Analytics").click();
    cy.url().should("include", "/projects/");
  });

  // TC-7 Project Creation
  it("TC-7 Project Creation", function () {
    cy.login(this.data.email, this.data.password);
    cy.contains("Create new project").click();
    cy.get("#project-name").type(`Auto Project ${Date.now()}`);
    cy.get("#project-url").type(this.data.websiteUrl);
    cy.contains("button", "Create project").click();
    cy.url().should("include", "/analysis"); // redirects to the new project
  });

  // TC-8 Existing Project Selection
  it("TC-8 Existing Project Selection", function () {
    cy.login(this.data.email, this.data.password);
    cy.contains("a", this.data.projectName).click(); // the project tile link (not the switcher <option>)
    cy.url().should("include", "/projects/");
  });

  // TC-9 Website Audit Execution  (needs OpenAI key; crawls the project URL)
  it("TC-9 Website Audit Execution", function () {
    cy.login();
    cy.visit(`/projects/${this.data.projectId}/fixes`);
    cy.contains("button", /run site audit|re-run audit/i).click();
    cy.contains("Per-page audit", { timeout: 120000 }).should("exist"); // result renders in a scroll area
  });

  // TC-10 Audit Result Display
  it("TC-10 Audit Result Display", function () {
    cy.login();
    cy.visit(`/projects/${this.data.projectId}`); // analytics overview shows the scores
    cy.contains("SEO Health").should("be.visible");
    cy.contains("AI Share of Voice").should("be.visible");
  });

  // TC-11 Analytics Data Display
  it("TC-11 Analytics Data Display", function () {
    cy.openProject();
    cy.contains("a", "Analytics").click();
    cy.contains("SEO Health").should("be.visible");
  });

  // TC-12 Keyword Extraction  (needs OpenAI + Serper keys)
  it("TC-12 Keyword Extraction", function () {
    cy.login();
    cy.visit(`/projects/${this.data.projectId}/keywords`);
    cy.contains("button", "Analyze keywords").click();
    cy.get("table tbody tr", { timeout: 90000 }).should("have.length.greaterThan", 0);
  });

  // TC-13 Content Generation  (asserts the generation actually starts)
  it("TC-13 Content Generation", function () {
    cy.login();
    cy.visit(`/projects/${this.data.projectId}/content-gen`);
    // Leave the topic blank → uses the project's detected keyword (no relevance check).
    cy.contains("button", "Start workflow").click();
    cy.contains(/generating your content/i, { timeout: 60000 }).should("be.visible");
  });

  // TC-14 Logout Functionality
  it("TC-14 Logout Functionality", function () {
    cy.login(this.data.email, this.data.password);
    cy.contains("Logout").click();
    cy.url().should("include", "/login");
  });
});
