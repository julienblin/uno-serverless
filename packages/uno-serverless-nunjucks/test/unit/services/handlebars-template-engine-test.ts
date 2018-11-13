import { expect } from "chai";
import { NunjucksTemplateEngine } from "../../../src/services/nunjucks-template-engine";

describe("NunjucksTemplateEngineOptions", () => {
  const templateEngine = new NunjucksTemplateEngine({
    filters: {
      custom: () => "custom-helper",
    },
    templateDirectory: "./test/unit/templates",
  });

  it("should render basic template", async () => {
    const result = await templateEngine.render("basic.njk", { name: "foo" });
    const result2 = await templateEngine.render("basic.njk", { name: "foo" });

    expect(result).to.equal("Hello, foo.");
    expect(result2).to.equal(result);
  });

  it("should format date", async () => {
    const result = await templateEngine.render(
      "date.njk",
      {
        dateFormat: "YYYY/MM/DD",
        thedate: new Date(2000, 0, 1),
      });

    expect(result).to.equal("Result: 2000/01/01");
  });

  it("should pluralize", async () => {
    const result = await templateEngine.render(
      "pluralize.njk",
      {
        number: 1,
        subject: "child",
      });

    expect(result).to.equal("Result: child");

    const result2 = await templateEngine.render(
      "pluralize.njk",
      {
        number: 2,
        subject: "child",
      });

    expect(result2).to.equal("Result: children");
  });

  it("should format currencies", async () => {
    const result = await templateEngine.render(
      "currency.njk",
      {
        amount: 1.25,
        currency: "USD",
      });

    expect(result).to.equal("Result: $1.25");
  });

  it("should user custom helpers", async () => {
    const result = await templateEngine.render(
      "custom.njk",
      {
      });

    expect(result).to.equal("Result: custom-helper");
  });

  it("should format numbers", async () => {
    const result = await templateEngine.render(
      "number.njk",
      {
        x: 1000000,
        y: 1234567,
        z: 7654321,
        zopts: { precision: 2 },
      });

    expect(result).to.equal("x: 1,000,000 / y: 1 234 567,0 / z: 7,654,321.00");
  });
});
