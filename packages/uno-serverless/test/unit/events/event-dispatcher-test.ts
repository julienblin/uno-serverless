import { expect } from "chai";
import { StandardErrorCodes } from "../../../src/core/errors";
import { randomStr } from "../../../src/core/utils";
import { LocalEventDispatcher } from "../../../src/events/event-dispatcher";

describe("LocalEventDispatcher", () => {

  enum EventTypes {
    NewUser = "new-user",
    OrderUpdate = "order-update",
  }

  it("should process events", async () => {
    let newUserRun = 0;
    let orderUpdateRun = 0;
    let allRun1 = 0;
    let allRun2 = 0;
    const dispatcher = new LocalEventDispatcher({
      processors: {
        "*": [
          async (evt) => { ++allRun1; },
          async (evt) => { ++allRun2; },
        ],
        [EventTypes.NewUser]: [
          async (evt) => { ++newUserRun; },
        ],
        [EventTypes.OrderUpdate]: [
          async (evt) => { ++orderUpdateRun; },
        ],
      },
    });

    await dispatcher.dispatch({
      id: randomStr(12),
      type: EventTypes.NewUser,
    });

    expect(newUserRun).to.equal(1);
    expect(orderUpdateRun).to.equal(0);
    expect(allRun1).to.equal(1);
    expect(allRun2).to.equal(1);

    await dispatcher.dispatch({
      id: randomStr(12),
      type: EventTypes.OrderUpdate,
    });

    expect(newUserRun).to.equal(1);
    expect(orderUpdateRun).to.equal(1);
    expect(allRun1).to.equal(2);
    expect(allRun2).to.equal(2);
  });

  it("should return single error when only one", async () => {
    const thrownError = new Error("foo");
    let allRun = 0;
    const dispatcher = new LocalEventDispatcher({
      processors: {
        "*": [
          async (evt) => { ++allRun; },
        ],
        [EventTypes.NewUser]: [
          async (evt) => { throw thrownError; },
        ],
      },
    });

    try {
      await dispatcher.dispatch({
        id: randomStr(12),
        type: EventTypes.NewUser,
      });
      expect.fail();
    } catch (error) {
      expect(error.message).to.equal(thrownError.message);
      expect(allRun).to.equal(1);
    }
  });

  it("should return aggregate error when several", async () => {
    const thrownError1 = new Error("foo");
    const thrownError2 = new Error("bar");
    let allRun = 0;
    const dispatcher = new LocalEventDispatcher({
      processors: {
        "*": [
          async (evt) => { ++allRun; },
        ],
        [EventTypes.NewUser]: [
          async (evt) => { throw thrownError1; },
          async (evt) => { throw thrownError2; },
        ],
      },
    });

    try {
      await dispatcher.dispatch({
        id: randomStr(12),
        type: EventTypes.NewUser,
      });
      expect.fail();
    } catch (error) {
      expect(error.code).to.equal(StandardErrorCodes.AggregateError);
      expect(error.details[0].message).to.equal(thrownError1.message);
      expect(allRun).to.equal(1);
    }
  });

  it("should be ok with no processors", async () => {
    const dispatcher = new LocalEventDispatcher({
      processors: {
        [EventTypes.NewUser]: [
          async (evt) => { throw new Error("not implemented"); },
        ],
      },
    });

    await dispatcher.dispatch({
      id: randomStr(12),
      type: EventTypes.OrderUpdate,
    });

    expect(true);
  });
});
