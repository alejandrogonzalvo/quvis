import { Playground } from "../src/Playground.js";

// Mock Playground
jest.mock('../src/Playground.js', () => {
    return {
        Playground: jest.fn().mockImplementation(() => {
            return {
                animate: jest.fn(), // Mock the animate method
            };
        })
    };
});

describe("main.ts", () => {
    it("should execute without errors", () => {
        expect(() => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require("../src/main.js"); // Execute the main script
        }).not.toThrow();

        // Optionally, verify that Playground constructor and animate were called
        expect(Playground).toHaveBeenCalledTimes(1);
        const playgroundInstance = (Playground as jest.Mock).mock.instances[0];
        expect(playgroundInstance.animate).toHaveBeenCalledTimes(1);
    });
}); 