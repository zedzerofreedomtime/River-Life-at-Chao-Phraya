import { test, expect } from "@playwright/test";
import { money } from "../apps/web/src/data/api";

test("displayed totals preserve satang charged by the backend", () => {
  expect(money(199950)).toBe("฿1,999.50");
  expect(money(120001)).toBe("฿1,200.01");
  expect(money(120000)).toBe("฿1,200");
  expect(money(0)).toBe("฿0");
});
