import { expect } from "chai";
import { HandlebarsTemplateEngine } from "../../../src/services/handlebars-template-engine";

describe("HandlebarsTemplateEngineOptions", () => {

  const templateEngine = new HandlebarsTemplateEngine({
    helpers: {
      custom: () => "custom-helper",
    },
    templateDirectory: "./test/unit/templates",
  });

  it("should render basic template", async () => {
    const result = await templateEngine.render("basic.handlebars", { name: "foo" });
    const result2 = await templateEngine.render("basic.handlebars", { name: "foo" });

    expect(result).to.equal("Hello, foo.");
    expect(result2).to.equal(result);
  });

  it("should format date", async () => {
    const result = await templateEngine.render(
      "date.handlebars",
      {
        dateFormat: "YYYY/MM/DD",
        thedate: new Date(2000, 0, 1),
      });

    expect(result).to.equal("Result: 2000/01/01");
  });

  it("should pluralize", async () => {
    const result = await templateEngine.render(
      "pluralize.handlebars",
      {
        number: 1,
        subject: "child",
      });

    expect(result).to.equal("Result: child");

    const result2 = await templateEngine.render(
      "pluralize.handlebars",
      {
        number: 2,
        subject: "child",
      });

    expect(result2).to.equal("Result: children");
  });

  it("should format currencies", async () => {
    const result = await templateEngine.render(
      "currency.handlebars",
      {
        amount: 1.25,
        currency: "USD",
      });

    expect(result).to.equal("Result: $1.25");
  });

  it("should format lowercase", async () => {
    const result = await templateEngine.render(
      "lowercase.handlebars",
      {
        value: "Foo",
      });

    expect(result).to.equal("Result: foo");
  });

  it("should format uppercase", async () => {
    const result = await templateEngine.render(
      "uppercase.handlebars",
      {
        value: "Foo",
      });

    expect(result).to.equal("Result: FOO");
  });

  it("should user custom helpers", async () => {
    const result = await templateEngine.render(
      "custom.handlebars",
      {
      });

    expect(result).to.equal("Result: custom-helper");
  });

  it("should user custom helpers", async () => {
    const result = await templateEngine.render(
      "partials.handlebars",
      {
        name: "foobar",
      });

    expect(result).to.equal("Result: Hello, FOOBAR. How are you today?");
  });

  it("should allow layout", async () => {
    const result = await templateEngine.render(
      "layout-content.handlebars",
      {
        name: "foobar",
      });

    expect(result).to.contain("Header");
    expect(result).to.contain("Hello, foobar");
    expect(result).to.contain("Footer");
  });
});
