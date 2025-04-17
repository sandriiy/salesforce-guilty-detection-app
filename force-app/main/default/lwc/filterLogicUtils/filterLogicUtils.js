const tokenizeLogic = (logic) => {
    return logic.match(/\d+|AND|OR|\(|\)/g) || [];
};

const isLogicalOperator = (token) => token === 'AND' || token === 'OR';

const validateFilterLogic = (logic, filterCount) => {
    if (!logic || logic.trim() === '') {
        return { isValid: false, error: 'Filter logic must be specified' };
    }

    const fullMatchPattern = /^(\s*(\d+|AND|OR|\(|\))\s*)+$/;
    if (!fullMatchPattern.test(logic)) {
        return {
            isValid: false,
            error: 'Filter logic contains invalid characters',
        };
    }

    const tokens = tokenizeLogic(logic);
    const validTokens = new Set(['AND', 'OR', '(', ')']);
    let openParens = 0;

    for (const token of tokens) {
        if (token === '(') {
            openParens++;
        } else if (token === ')') {
            openParens--;
            if (openParens < 0) {
                return { isValid: false, error: 'Mismatched parentheses' };
            }
        } else if (!validTokens.has(token)) {
            if (!/^\d+$/.test(token)) {
                return {
                    isValid: false,
                    error: `Invalid token: "${token}"`,
                };
            }

            const index = parseInt(token, 10);
            if (index >= filterCount) {
                return {
                    isValid: false,
                    error: `Index "${index}" does not exist`,
                };
            }
        }
    }

    if (openParens !== 0) {
        return { isValid: false, error: 'Mismatched parentheses' };
    }

    return { isValid: true, error: '' };
};

const isValidIndex = (token, filterCount) => {
    const index = parseInt(token, 10);
    return !isNaN(index) && index >= 0 && index < filterCount;
};

const autoUpdateFilterLogic = (existingLogic, newIndex) => {
    const tokens = tokenizeLogic(existingLogic);
    if (tokens.length === 0) {
        return `${newIndex}`;
    }
    return `${existingLogic} AND ${newIndex}`;
};

const recalculateFilterLogic = (oldLogic, removedIndex) => {
    const tokens = tokenizeLogic(oldLogic);
    const result = [];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token === removedIndex.toString()) {
            if (result.length > 0 && isLogicalOperator(result[result.length - 1])) {
                result.pop();
            } else if (i + 1 < tokens.length && isLogicalOperator(tokens[i + 1])) {
                i++;
            }

            continue;
        }

        if (!isNaN(token)) {
            const num = parseInt(token, 10);
            result.push(num > removedIndex ? (num - 1).toString() : token);
        } else {
            result.push(token);
        }
    }

    return result.join(' ');
};

const validateFilterLogicStructure = (logic) => {
    const tokens = tokenizeLogic(logic);
    const stack = [];
    const errors = [];

    let prevToken = null;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // Check for standalone values inside parentheses
        if (token === '(') {
            stack.push({ startIndex: i, content: [] });
        } else if (token === ')') {
            const last = stack.pop();
            if (last && last.content.length === 1 && !isNaN(last.content[0])) {
                errors.push(`Index "${last.content[0]}" cannot be a standalone condition`);
            }
        } else if (stack.length > 0) {
            stack[stack.length - 1].content.push(token);
        }

        // Check for trailing AND / OR
        if (isLogicalOperator(prevToken) && (i === tokens.length)) {
            errors.push(`Filter logic cannot end with a logical operator`);
        }

        prevToken = token;
    }

    if (isLogicalOperator(tokens[tokens.length - 1])) {
        errors.push(`Filter logic cannot end with a logical operator`);
    }

    return errors;
};

export { validateFilterLogicStructure, validateFilterLogic, autoUpdateFilterLogic, recalculateFilterLogic };