/// <reference types="@types/jest" />
import { Timeline } from "../src/Timeline.js";
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { SpyInstance, Mock } from "jest-mock";

describe("Timeline", () => {
    let mockSlider: HTMLInputElement;
    let mockMarkersContainer: HTMLDivElement;
    let mockAppendChild: SpyInstance<(node: Node) => Node>;
    let mockRemoveChild: SpyInstance<(node: Node) => Node>;
    let mockGetElementById: SpyInstance<() => HTMLElement | null>;
    let mockCreateElement: SpyInstance<(tagName: string) => HTMLElement>;
    let onSliceChangeCallback: Mock<void, [number]>;

    beforeEach(() => {
        // Mock HTMLInputElement for the slider
        mockSlider = document.createElement('input') as HTMLInputElement;
        mockSlider.type = 'range';
        mockSlider.min = "0";
        mockSlider.max = "0";
        mockSlider.value = "0";
        mockSlider.step = "1";
        jest.spyOn(mockSlider, 'addEventListener');
        jest.spyOn(mockSlider, 'removeEventListener');

        // Mock HTMLDivElement for markers
        mockMarkersContainer = document.createElement('div');
        // jest.spyOn(mockMarkersContainer.style, 'setProperty'); // setProperty is not standard on style object, consider direct assignment or specific property spies


        mockAppendChild = jest.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => node as ChildNode);
        mockRemoveChild = jest.spyOn(document.body, 'removeChild').mockImplementation((node: Node) => node as ChildNode);
        mockGetElementById = jest.spyOn(document, 'getElementById').mockReturnValue(mockSlider);
        
        // Ensure createElement returns the correct type for markers
        mockCreateElement = jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            if (tagName === 'div') {
                const div = document.createElement('div');
                // Spy on style changes for created marker divs if necessary
                // jest.spyOn(div.style, 'position', 'set'); 
                // jest.spyOn(div.style, 'left', 'set'); 
                // ... and so on for other style properties
                return div;
            }
            return document.createElement(tagName); // Fallback for other elements
        });
        
        onSliceChangeCallback = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks(); // Ensure all mocks are restored
    });

    it("should be created without errors and setup DOM elements", () => {
        expect(() => new Timeline(onSliceChangeCallback)).not.toThrow();
        expect(mockGetElementById).toHaveBeenCalledWith("timeline");
        expect(mockCreateElement).toHaveBeenCalledWith("div"); // For markers container
        expect(mockAppendChild).toHaveBeenCalledTimes(1); // For markers container
        expect(mockSlider.addEventListener).toHaveBeenCalledWith("input", expect.any(Function));
    });

    it("addSlice should increment slices and update view", () => {
        const timeline = new Timeline(onSliceChangeCallback);
        timeline.addSlice();
        expect(timeline.slices).toBe(1);
        expect(timeline.currentSlice).toBe(1);
        expect(mockSlider.max).toBe("0"); // slices - 1
        expect(mockSlider.value).toBe("0"); // currentSlice -1
        // Potentially check if updateMarkers was called if it has side effects beyond innerHTML
    });

    it("setSlice should update currentSlice and view", () => {
        const timeline = new Timeline(onSliceChangeCallback);
        timeline.slices = 5; // Manually set slices for testing
        timeline.setSlice(2);
        expect(timeline.currentSlice).toBe(2);
        expect(mockSlider.value).toBe("1"); // sliceIndex -1 (if onSliceChange updates it this way)
    });
    
    it("slider input should trigger onSliceChange", () => {
        const timeline = new Timeline(onSliceChangeCallback);
        timeline.slices = 3;
        timeline.updateView(); // Ensure slider max is set

        mockSlider.value = "1"; // Simulate user moving slider to the second slice (index 1)
        const event = new Event("input", { bubbles: true, cancelable: true });
        mockSlider.dispatchEvent(event);
        
        expect(onSliceChangeCallback).toHaveBeenCalledWith(1);
        expect(timeline.currentSlice).toBe(1);
    });

    it("destroy should remove event listener and DOM element", () => {
        const timeline = new Timeline(onSliceChangeCallback);
        const handleInputFn = (mockSlider.addEventListener as Mock).mock.calls[0][1];
        
        timeline.destroy();
        
        expect(mockSlider.removeEventListener).toHaveBeenCalledWith("input", handleInputFn);
        expect(mockRemoveChild).toHaveBeenCalledWith(timeline.markers); // timeline.markers is the created div
    });

    it("updateMarkers should create correct number of marker elements", () => {
        const timeline = new Timeline(onSliceChangeCallback);
        timeline.slices = 3;
        timeline.updateMarkers();
        // markers div is created in constructor, updateMarkers clears and adds to it
        expect(timeline.markers.children.length).toBe(3); 
    });
}); 