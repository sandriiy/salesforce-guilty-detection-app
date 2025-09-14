import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const TEXT_FIELD_CONDITIONS = [
    { label: 'Equals', value: 'equals' },
    { label: 'Not Equal', value: 'notEqual' },
    { label: 'Contains', value: 'contains' },
    { label: 'Does Not Contain', value: 'doesNotContain' },
    { label: 'Starts With', value: 'startsWith' },
    { label: 'Ends With', value: 'endsWith' },
    { label: 'Is Null', value: 'isNull' }
];

const NUMBER_FIELD_CONDITIONS = [
    { label: 'Equals', value: 'equals' },
    { label: 'Not Equal', value: 'notEqual' },
    { label: 'Greater Than', value: 'greaterThan' },
    { label: 'Less Than', value: 'lessThan' },
    { label: 'Greater Than or Equal To', value: 'greaterOrEqualTo' },
    { label: 'Less Than or Equal To', value: 'lessOrEqualTo' },
    { label: 'Is Null', value: 'isNull' }
];

const CHECKBOX_FIELD_CONDITIONS = [
    { label: 'Equals', value: 'equals' },
    { label: 'Not Equal', value: 'notEqual' }
];

const LOOKUP_FIELD_CONDITIONS = [
    { label: 'Equals', value: 'equals' },
    { label: 'Not Equal', value: 'notEqual' },
    { label: 'Is Null', value: 'isNull' }
];

const DATE_FIELD_CONDITIONS = [
    { label: 'Equals', value: 'equals' },
    { label: 'Not Equal', value: 'notEqual' },
    { label: 'Before', value: 'before' },
    { label: 'After', value: 'after' },
    { label: 'Is Null', value: 'isNull' }
];

export const BOOLEAN_AS_PICKLIST_VALUES = [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
];

export const GUILTY_REVIEWER_ROLE_NAME = 'Reviewer';
export const GUILTY_ADMIN_ROLE_NAME = 'Admin';
export const GUILTY_BOTH_ROLE_NAME = 'Both';

export const GUILTY_ROLE_OPTIONS = [
        { label: GUILTY_ADMIN_ROLE_NAME, value: GUILTY_ADMIN_ROLE_NAME },
        { label: GUILTY_REVIEWER_ROLE_NAME, value: GUILTY_REVIEWER_ROLE_NAME },
        { label: GUILTY_BOTH_ROLE_NAME, value: GUILTY_BOTH_ROLE_NAME }
    ];

export const STATUSES_GRAPH_COLOR_MAP = {
    Draft: '#9e9e9e',
    Pending: '#f4b400',
    Ongoing: '#0070d2',
    Completed: '#2e844a',
    Overdue: '#fb8c00'
};

export const PROGRESS_GRAPH_COLOR_MAP = {
    Low: '#f5a623',
    Medium: '#0070d2',
    High: '#28a745'
};

const showToast = (context, title, message, variant = 'info', mode = 'dismissable') => {
    context.dispatchEvent(new ShowToastEvent({
        title,
        message,
        variant,
        mode
    }));
};

const isEmpty = (value) => {
    return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0 || value === false);
};

const getFieldTypeConditions = (fieldType) => {
    const conditionsMap = {
        'datetime-local': DATE_FIELD_CONDITIONS,
        'date': DATE_FIELD_CONDITIONS,
        'time': DATE_FIELD_CONDITIONS, 
        'text': TEXT_FIELD_CONDITIONS,
        'picklist': TEXT_FIELD_CONDITIONS, 
        'currency': NUMBER_FIELD_CONDITIONS,
        'number': NUMBER_FIELD_CONDITIONS, 
        'checkbox': CHECKBOX_FIELD_CONDITIONS, 
        'tel': TEXT_FIELD_CONDITIONS,
        'email': TEXT_FIELD_CONDITIONS, 
        'url': LOOKUP_FIELD_CONDITIONS, 
        'lookup': LOOKUP_FIELD_CONDITIONS
    };

    return conditionsMap[fieldType] || [];
}

const getFieldTypeForInput = (fieldType) => {
    const fieldTypeMap = {
        'DATETIME': 'datetime-local',
        'DATE': 'date',
        'TIME': 'time',
        'TEXT': 'text',
        'STRING': 'text',
        'PICKLIST': 'picklist',
        'CURRENCY': 'currency',
        'BOOLEAN': 'picklist',
        'NUMBER': 'number',
        'INTEGER': 'number',
        'DOUBLE': 'number',
        'EMAIL': 'email',
        'PHONE': 'tel',
        'URL': 'url',
        'REFERENCE': 'lookup',
        'ID': 'lookup',
    };

    return fieldTypeMap[fieldType] || 'text'; 
}

const generateId = (length = 8) => {
    return Array.from(crypto.getRandomValues(new Uint8Array(length)))
        .map(b => b.toString(36))
        .join('')
        .slice(0, length);
}

const extractErrorMessage = (error) => {
    let rawMessage =
        error?.body?.message ||
        error?.message ||
        'Contact your System Administrator for assistance';

    rawMessage = rawMessage.replace(/^System\.\w+Exception:\s*/i, '');
    rawMessage = rawMessage.replace(/(\n|\\n).*$/, '').trim();
    return rawMessage;
}

export { showToast, extractErrorMessage, isEmpty, getFieldTypeConditions, getFieldTypeForInput, generateId };