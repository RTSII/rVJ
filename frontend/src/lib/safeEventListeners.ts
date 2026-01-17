/**
 * Safe event listener utility functions to prevent errors with null elements
 */

/**
 * Safely add an event listener to an element
 * @param element The DOM element or null/undefined
 * @param event The event name
 * @param handler The event handler function
 * @param options Event listener options
 * @returns A cleanup function to remove the event listener
 */
export function safeAddEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement | null | undefined,
    event: K,
    handler: (ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
): () => void {
    if (element) {
        element.addEventListener(event, handler as EventListener, options);
        return () => element.removeEventListener(event, handler as EventListener, options);
    }
    return () => { }; // Empty cleanup function if no element
}

/**
 * Safely remove an event listener from an element
 * @param element The DOM element or null/undefined
 * @param event The event name
 * @param handler The event handler function
 * @param options Event listener options
 */
export function safeRemoveEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement | null | undefined,
    event: K,
    handler: (ev: HTMLElementEventMap[K]) => any,
    options?: boolean | EventListenerOptions
): void {
    if (element) {
        element.removeEventListener(event, handler as EventListener, options);
    }
}
