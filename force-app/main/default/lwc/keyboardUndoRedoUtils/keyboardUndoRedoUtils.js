const historyMap = new WeakMap();
const elementListenerMap = new WeakMap();

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function peek(stack) {
    return stack[stack.length - 1];
}

export const keyboardUndoRedoUtils = {
    register(component, options) {
        const { getState, setState, element } = options;

        const undoStack = [];
        const redoStack = [];

        undoStack.push(deepClone(getState()));

        const keyHandler = (event) => {
            if (!(event.ctrlKey || event.metaKey)) return;

            const key = event.key.toLowerCase();
            if (key === 'z') {
                event.preventDefault();
                if (undoStack.length > 1) {
                    const current = undoStack.pop();
                    redoStack.push(current);
                    
                    const prev = peek(undoStack);
                    setState(deepClone(prev));
                }
            } else if (key === 'y') {
                event.preventDefault();
                if (redoStack.length > 0) {
                    const next = redoStack.pop();
                    undoStack.push(next);
                    setState(deepClone(next));
                }
            }
        };

        element.addEventListener('keydown', keyHandler);
        element.tabIndex = 0;

        elementListenerMap.set(component, { keyHandler, element });
        historyMap.set(component, { undoStack, redoStack, getState, setState });
    },

    unregister(component) {
        const listenerData = elementListenerMap.get(component);
        if (listenerData) {
            listenerData.element.removeEventListener('keydown', listenerData.keyHandler);
            elementListenerMap.delete(component);
        }
        historyMap.delete(component);
    },

    pushState(component) {
        const history = historyMap.get(component);
        if (history) {
            const snapshot = deepClone(history.getState());
            history.undoStack.push(snapshot);
            history.redoStack.length = 0;
        }
    }
};
