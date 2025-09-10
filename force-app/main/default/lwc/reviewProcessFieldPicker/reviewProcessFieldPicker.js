import { LightningElement, api, track } from 'lwc';

import { keyboardUndoRedoUtils } from 'c/keyboardUndoRedoUtils';
import getSobjectFields from '@salesforce/apex/ReviewProcessController.getAllSObjectFields';
import { showToast, isEmpty, getFieldTypeForInput, generateId } from 'c/utils';

export default class ReviewProcessFieldPicker extends LightningElement {
    @api record;
    @api stepKey;

    isKeyboardRegistered = false;
    isLoading = false;
    isIncompleteStep = false;

    @track reviewObject;
    @track fieldOptions = [];
    @track selectedFields = [];

    async connectedCallback() {
        this.isLoading = true;
        await this.resolveDataPopulation();
        await this.resolveSobjectFieldsSearch();
        this.isLoading = false;
    }

    renderedCallback() {
        const fieldsContainer = this.refs.fieldsContainer;
        if (!this.isKeyboardRegistered && !isEmpty(fieldsContainer)) {
            this.resolveRedoUndoTracking(fieldsContainer);
            this.isKeyboardRegistered = true;
        }
    }

    disconnectedCallback() {
        keyboardUndoRedoUtils.unregister(this);
    }

    handleFieldChange(event) {
        const newField = event.target.value;

        const parentContainer = event.target.closest('div[data-index]');
        const parentContainerIndex = parentContainer.getAttribute('data-index');

        let selectedField = this.selectedFields[parentContainerIndex];
        selectedField.field = newField;
        keyboardUndoRedoUtils.pushState(this);
    }

    handleFieldInstructionsChange(event) {
        const newInstructions = event.target.value;

        const parentContainer = event.target.closest('div[data-index]');
        const parentContainerIndex = parentContainer.getAttribute('data-index');

        let selectedField = this.selectedFields[parentContainerIndex];
        selectedField.helptext = newInstructions;
        keyboardUndoRedoUtils.pushState(this);
    }

    handleAddNewField(event) {
        this.addNewField();
        keyboardUndoRedoUtils.pushState(this);
    }

    handleRemoveField(event) {
        const parentContainer = event.target.closest('div[data-index]');
        const parentContainerIndex = parentContainer.getAttribute('data-index');
        this.selectedFields.splice(parentContainerIndex, 1);
        keyboardUndoRedoUtils.pushState(this);
    }

    handleFieldsStepBack(event) {
        this.notifyReviewProcessWizard('stepback', this.stepKey);
    }

    handleFieldsStepSave(event) {
        const isVerifiedData = this.verifyData();
        if (isVerifiedData) {
            let compiledData = this.compileFinalData();
            this.notifyReviewProcessWizard('stepsave', compiledData);
        }
    }

    async resolveDataPopulation() {
        const fieldsForReview = this.record?.fields?.FieldsForReview__c?.value;
        if (!isEmpty(fieldsForReview)) {
            const compiledData = JSON.parse(fieldsForReview);
            this.reviewObject = compiledData.selectedSObject;
            this.selectedFields = compiledData.selectedFields;
        } else {
            const filterCriteria = this.record?.fields?.FilterCriteria__c?.value;

            if (!isEmpty(filterCriteria)) {
                const compiledData = JSON.parse(filterCriteria);
                this.reviewObject = compiledData.selectedSObject;
            } else {
                this.isIncompleteStep = true;
            }
        }

        if (isEmpty(this.selectedFields)) {
            this.addNewField(); 
        }
    }

    async resolveSobjectFieldsSearch() {
        if (this.isIncompleteStep) return;
        
        await getSobjectFields({ sObjectName: this.reviewObject })
            .then((data) => {
                this.fieldOptions = this.filterSobjectFieldOptions(data);
            })
            .catch((error) => {
                this.reviewObject = undefined;
                console.error(error);
            });
    }

    resolveRedoUndoTracking(container) {
        keyboardUndoRedoUtils.register(this, {
            element: container,
            getState: () => ({
                selectedFields: this.selectedFields
            }),
            setState: (state) => {
                this.selectedFields = [...state.selectedFields]
            }
        });
    }

    filterSobjectFieldOptions(fields) {
        if (isEmpty(fields)) return [];

        return fields.map(field => {
            return {
                label: field.label,
                value: field.name,
                type: getFieldTypeForInput(field.type)
            };
        });
    }
    
    verifyData() {
        if (isEmpty(this.selectedFields) || this.isAnyAttributeSet === false) {
            showToast(
                this,
                'Missing Fields For Review Process',
                'Please ensure at least one field has been added before retrying'
            );
            return false;
        }

        return true;
    }

    compileFinalData() {
        return JSON.stringify({
            selectedSObject: this.reviewObject,
            selectedFields: this.selectedFields
        });
    }

    notifyReviewProcessWizard(eventName, data) {
        this.dispatchEvent(new CustomEvent(eventName, {
            detail: data
        }));
    }

    addNewField() {
        this.selectedFields.push({
            id: generateId(),
            field: '',
            helptext: '',
        });
    }

    generateId(length = 8) {
        return Array.from(crypto.getRandomValues(new Uint8Array(length)))
            .map(b => b.toString(36))
            .join('')
            .slice(0, length);
    }

    get isAvailableStep() {
        return !this.isIncompleteStep;
    }

    get isRemoveDisabled() {
        return isEmpty(this.selectedFields) || this.selectedFields.length === 1;
    }

    get isAnyAttributeSet() {
        return !isEmpty(this.selectedFields[0].field);
    }
}