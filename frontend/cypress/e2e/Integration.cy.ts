/// <reference types="cypress" />

// Integration Testing — wired to the real app + seeded verified account/project.
// Heavy AI flows assert that the action triggers / the request succeeds (reliable),
// rather than waiting on slow model output.
describe("Integration Testing - Highlight AI SEO Tool", () => {
  beforeEach(() => {
    cy.fixture("testData").as("data");
  });

  // TC-1 Login–Dashboard Integration
  it("TC-1 Login–Dashboard Integration", function () {
    cy.login(this.data.email, this.data.password);
    cy.url().should("include", "/dashboard");
    cy.contains("Dashboard").should("be.visible");
  });

  // TC-2 Project–Audit Integration  (creates a project, then audits it)
  it("TC-2 Project–Audit Integration", function () {
    cy.login(this.data.email, this.data.password);
    cy.contains("Create new project").click();
    cy.get("#project-name").type(`Integration SEO Project ${Date.now()}`);
    cy.get("#project-url").type("https://example.com");
    cy.contains("button", "Create project").click();
    cy.url()
      .should("include", "/analysis")
      .then((url) => {
        const id = (url.match(/\/projects\/([0-9a-f-]+)/i) as RegExpMatchArray)[1];
        cy.visit(`/projects/${id}/fixes`);
        cy.contains("button", /run site audit|re-run audit/i).click();
        cy.contains("Per-page audit", { timeout: 120000 }).should("exist");
      });
  });

  // TC-3 Audit–Result Display Integration
  it("TC-3 Audit–Result Display Integration", function () {
    cy.login();
    cy.visit(`/projects/${this.data.projectId}`);
    cy.contains("SEO Health").should("be.visible");
    cy.contains("AI Share of Voice").should("be.visible");
  });

  // TC-4 Audit–Analytics Integration
  it("TC-4 Audit–Analytics Integration", function () {
    cy.openProject();
    cy.contains("a", "Analytics").click();
    cy.contains("SEO Health").should("be.visible");
    cy.contains("SEO").should("exist");
  });

  // TC-5 Keyword–Prompt Integration
  it("TC-5 Keyword–Prompt Integration", function () {
    cy.login();
    cy.visit(`/projects/${this.data.projectId}/keywords`);
    cy.contains("button", "Analyze keywords").click();
    cy.get("table tbody tr", { timeout: 90000 }).should("have.length.greaterThan", 0);

    cy.intercept("POST", "**/api/v1/prompts/optimize").as("optimize");
    cy.visit(`/projects/${this.data.projectId}/prompts`);
    cy.contains("button", "Optimize prompts").click();
    cy.wait("@optimize", { timeout: 90000 })
      .its("response.statusCode")
      .should("be.oneOf", [200, 201]);
  });

  // TC-6 Prompt–Content Integration
  it("TC-6 Prompt–Content Integration", function () {
    cy.login();
    cy.visit(`/projects/${this.data.projectId}/content-gen`);
    cy.contains("button", "Start workflow").click(); // blank topic -> auto keyword
    cy.contains(/generating your content/i, { timeout: 60000 }).should("be.visible");
  });

  // TC-7 AI Visibility Integration
  it("TC-7 AI Visibility Integration", function () {
    cy.login();
    cy.visit(`/projects/${this.data.projectId}/visibility`);
    cy.contains("button", "Run live scan").click();
    cy.contains(/scanning ai engines/i, { timeout: 20000 }).should("be.visible");
  });

  // TC-8 Competitor Benchmarking Integration
  it("TC-8 Competitor Benchmarking Integration", function () {
    cy.login();
    cy.visit(`/projects/${this.data.projectId}/competitors`);
    cy.contains("Compare against a competitor").should("be.visible");
    cy.contains("button", "Compare").should("exist");
  });

  // TC-9 Backlink–Outreach Integration
  it("TC-9 Backlink–Outreach Integration", function () {
    cy.login();
    cy.visit(`/projects/${this.data.projectId}/backlinks`);
    cy.contains("button", "Generate opportunities").click();
    cy.contains(/finding opportunities|scraping prospects/i, { timeout: 20000 }).should(
      "be.visible",
    );
  });

  // TC-10 Third-Party API Integration  (content-gen calls the backend -> AI)
  it("TC-10 Third-Party API Integration", function () {
    cy.login();
    cy.intercept("POST", "**/api/v1/content/generate").as("generate");
    cy.visit(`/projects/${this.data.projectId}/content-gen`);
    cy.contains("button", "Start workflow").click(); // blank topic -> auto keyword
    cy.wait("@generate", { timeout: 60000 })
      .its("response.statusCode")
      .should("be.oneOf", [200, 201]);
  });

  // TC-11 Module Data Consistency
  it("TC-11 Module Data Consistency", function () {
    cy.openProject();
    cy.contains("a", "Analytics").click();
    cy.contains("a", "Dashboard").click();
    cy.contains("a", "Projects").click();
    cy.contains(this.data.projectName).should("exist");
  });

  // TC-12 Integration Error Handling
  it("TC-12 Integration Error Handling", function () {
    cy.login();
    cy.intercept("POST", "**/api/v1/content/generate", {
      statusCode: 500,
      body: { detail: "Something went wrong." },
    }).as("generateFail");
    cy.visit(`/projects/${this.data.projectId}/content-gen`);
    cy.contains("button", "Start workflow").click(); // blank topic -> auto keyword
    cy.wait("@generateFail");
    cy.contains(/something went wrong/i).should("be.visible");
  });
});
