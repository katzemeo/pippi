import { assert, assertEquals, assertNotEquals, assertStrictEquals, assertMatch, assertThrows, AssertionError } from "../deps.ts";

// Usage:
//   deno test
//   deno test tests/hello.test.ts
//   deno test --filter "Strict" tests/

Deno.test("Test Assert", () => {
  assert("Hello");
});

Deno.test("Test Assert Equals", () => {
  assertEquals(1, 1);
  assertEquals("Hello", "Hello");
  assertEquals(true, true);
  assertEquals(undefined, undefined);
  assertEquals(null, null);
  assertEquals(new Date(), new Date());
  assertEquals(new RegExp("abc"), new RegExp("abc"));

  class Foo{};
  const foo1 = new Foo();
  const foo2 = new Foo();

  assertEquals(foo1, foo2);
});

Deno.test("Test Assert Not Equals", () => {
  assertNotEquals(1, 2);
  assertNotEquals("Hello", "World");
  assertNotEquals(true, false);
  assertNotEquals(undefined, "");
  //assertNotEquals(new Date(), Date.now());
  assertNotEquals(new RegExp("abc"), new RegExp("def"));
});

Deno.test("Test Assert Strict Equals", () => {
  assertStrictEquals(1, 1);
  assertStrictEquals("Hello", "Hello");
  assertStrictEquals(true, true);
  assertStrictEquals(undefined, undefined);
});

Deno.test("Test Assert Match", () => {
  assertMatch("abcdefghi", new RegExp("def"));

  const basicUrl = new RegExp("^https?:\/\/[a-z\.]+\.com$");
  assertMatch("https://www.google.com", basicUrl);
  assertMatch("http://facebook.com", basicUrl);
});

Deno.test("Test Assert Throws", () => {
  assertThrows((): void => {
    assertStrictEquals(2, 3);
  });

  assertThrows((): void => {
    assertStrictEquals(2, 3, "Values Don't Match!");
  }, AssertionError, "Values Don't Match!");
});

Deno.test("Test Assert Equal Fail Custom Message", () => {
  assertEquals(1, 1, "Values Don't Match!");
});
