import { npzLoader } from "../src/npzLoader.js";

// Mock the global fetch function
global.fetch = jest.fn(() =>
    Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)), // Return empty ArrayBuffer
    } as Response) // Cast to Response to satisfy TypeScript
);

describe("npzLoader", () => {
    let loader: npzLoader;

    beforeEach(() => {
        // Clear mock calls before each test
        (global.fetch as jest.Mock).mockClear();
        loader = new npzLoader();
    });

    it("should be created without errors", () => {
        expect(() => new npzLoader()).not.toThrow();
    });

    it("load method should call fetch and attempt to parse (even with empty data)", async () => {
        // Spy on parseNPZ to ensure it's called and mock its implementation
        // to avoid errors with empty/invalid data for this smoke test.
        const parseNPZSpy = jest.spyOn(loader as any, 'parseNPZ').mockImplementation(() => ({}));

        await expect(loader.load("dummy.npz")).resolves.toEqual({});
        expect(fetch).toHaveBeenCalledWith("dummy.npz");
        expect(parseNPZSpy).toHaveBeenCalled();

        parseNPZSpy.mockRestore(); // Clean up spy
    });
}); 