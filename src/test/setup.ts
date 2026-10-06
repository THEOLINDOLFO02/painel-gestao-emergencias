import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, vi } from "vitest";

// O jsdom não traz Blob.text()/File.text().
if (!Blob.prototype.text) {
  Blob.prototype.text = function (this: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

beforeEach(() => {
  window.localStorage.clear();
  window.indexedDB = new IDBFactory();
  document.documentElement.removeAttribute("style");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
