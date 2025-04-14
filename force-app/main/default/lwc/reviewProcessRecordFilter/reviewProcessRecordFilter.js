import { LightningElement, api, track } from 'lwc';

import searchSobjects from '@salesforce/apex/ReviewProcessController.getSObjectsBySearch';
import getSobjectFields from '@salesforce/apex/ReviewProcessController.getAllSObjectFields';
import getPicklistValues from '@salesforce/apex/ReviewProcessController.getPicklistValues';

import { showToast, isEmpty, getFieldTypeConditions, getFieldTypeForInput } from 'c/utils';
import { validateFilterLogicStructure, validateFilterLogic, autoUpdateFilterLogic, recalculateFilterLogic } from 'c/filterLogicUtils';

export default class ReviewProcessRecordFilter extends LightningElement {
    @api record;
    @api stepKey;

    reviewObject;
    @track sObjectOptions = [];
    @track fieldOptions = [];
    @track filters = [];

    filterLogic = '';
    filterLogicValidity = true;

    handleObjectSearch(event) {
        const searchResult = event.detail.value;
        searchSobjects({ searchQuery: searchResult })
            .then((data) => {
                this.sObjectOptions = this.filterSobjectOptions(data);
                
                const customCombobox = this.template.querySelector('c-combobox[data-id="selectobject"]');
                customCombobox.processSearchResult(this.sObjectOptions);
            })
            .catch((error) => {
                console.error(error);
                showToast(
                    this,
                    'Unable To Retrieve SObjects',
                    'For more information, contact your System Administrator',
                    'error'
                );
            });
    }

    handleObjectSelectChange(event) {
        this.reviewObject = event.detail.value;
        getSobjectFields({ sObjectName: this.reviewObject })
            .then((data) => {
                this.fieldOptions = this.filterSobjectFieldOptions(data);
                this.addNewFilterCondition();
            })
            .catch((error) => {
                this.reviewObject = undefined;
                console.error(error);
                showToast(
                    this,
                    'Unable To Retrieve SObject Fields',
                    'For more information, contact your System Administrator',
                    'error'
                );
            });
    }

    handleFilterFieldChange(event) {
        const selectedField = event.target.value;
        const selectedFieldType = this.getFieldType(selectedField);

        const parentContainer = event.target.closest('div[data-index]');
        const parentContainerIndex = parentContainer.getAttribute('data-index');

        let selectedFilter = this.filters[parentContainerIndex];
        this.clearFilterReferences(selectedFilter);

        selectedFilter.field = selectedField;
        selectedFilter.type = selectedFieldType;
        selectedFilter.conditions = getFieldTypeConditions(selectedFieldType);
        selectedFilter.isDisabledConditions = isEmpty(selectedFilter.field) ? true : false;
        selectedFilter.isDisabledValue = isEmpty(selectedFilter.selectedCondition) ? true : false;

        this.resolveFieldReferences(selectedFilter);
    }

    handleFilterConditionChange(event) {
        const selectedOption = event.target.value;

        const parentContainer = event.target.closest('div[data-index]');
        const parentContainerIndex = parentContainer.getAttribute('data-index');

        let selectedFilter = this.filters[parentContainerIndex];
        selectedFilter.selectedCondition = selectedOption;
        selectedFilter.isDisabledValue = isEmpty(selectedFilter.selectedCondition) ? true : false;
    }

    handleFieldValueChange(event) {
        const selectedValue = event.target.value || event.detail.recordId;

        const parentContainer = event.target.closest('div[data-index]');
        const parentContainerIndex = parentContainer.getAttribute('data-index');

        let selectedFilter = this.filters[parentContainerIndex];
        selectedFilter.value = selectedValue;
    }

    handleAddFilter(event) {
        this.addNewFilterCondition();
    }

    handleRemoveFilter(event) {
        const parentContainer = event.target.closest('div[data-index]');
        const parentContainerIndex = parentContainer.getAttribute('data-index');
        this.filters.splice(parentContainerIndex, 1);
        this.filterLogic = recalculateFilterLogic(this.filterLogic, parentContainerIndex);
    }

    handleFilterLogicChange(event) {
        this.filterLogic = event.target.value;
    }

    handleFilterLogicValidation(event) {
        const filterLogicInput = this.refs.filterLogic;
        const validationStatus = validateFilterLogic(this.filterLogic, this.filters.length);
        this.filterLogicValidity = validationStatus.isValid;
        filterLogicInput.setCustomValidity(!validationStatus.isValid ? validationStatus.error : '');
        filterLogicInput.reportValidity();
    }

    handleFilterStepSave(event) {
        isVerifiedData = this.verifyData();
        if (isVerifiedData) {
            // modal window to verify data

            let compiledData = this.compileFinalData();
            this.notifyReviewProcessWizard(compiledData);
        }
    }

    filterSobjectOptions(sobjects) {
        return sobjects.map(record => ({
            label: record.Label,
            value: record.QualifiedApiName
        }));
    }

    filterSobjectFieldOptions(fields) {
        if (isEmpty(fields)) return [];

        return fields.map(field => {
            return {
                label: field.label,
                value: field.name,
                lookupTo: field.referenceTo,
                type: getFieldTypeForInput(field.type)
            };
        });
    }

    getFieldType(fieldName) {
        const field = this.fieldOptions.find(field => field.value === fieldName);
        return field ? field.type : 'text';
    }
    
    resolveFieldReferences(filter) {
        const field = this.fieldOptions.find(field => field.value === filter.field);

        if (filter.type === 'lookup') {
            filter.isLookup = true;
            filter.lookupTo = field.lookupTo;
        } else if (filter.type === 'picklist') {
            filter.isPicklist = true;
            
            getPicklistValues({ sObjectName: this.reviewObject, fieldName: field.value })
                .then((data) => {
                    filter.options = data;
                })
                .catch((error) => {
                    filter.field = undefined;
                    console.error(error);
                    showToast(
                        this,
                        'Unable To Retrieve Picklist Field Values',
                        'For more information, contact your System Administrator',
                        'error'
                    );
                });
        }
    }

    clearFilterReferences(filter) {
        filter.isLookup = false;
        filter.isPicklist = false;
        filter.options = [];
        filter.value = '';
        filter.selectedCondition = '';
    }

    addNewFilterCondition() {
        this.filters.push({
            id: this.generateId(),
            field: '',
            type: 'text',
            value: '',
            conditions: [],
            selectedCondition: '',
            options: [],
            lookupTo: '',
            isPicklist: false,
            isLookup: false,
            isDisabledConditions: true,
            isDisabledValue: true,
        });

        this.filterLogic = autoUpdateFilterLogic(this.filterLogic, (this.filters.length-1));
    }

    compileFinalData() {
        return JSON.stringify({
            selectedSObject: this.reviewObject,
            selectedFilters: this.filters,
            selectedFilterLogic: this.filterLogic
        });
    }

    notifyReviewProcessWizard(compiledFinalData) {
        this.dispatchEvent(new CustomEvent('stepsave', {
            detail: compiledFinalData
        }));
    }

    generateId(length = 8) {
        return Array.from(crypto.getRandomValues(new Uint8Array(length)))
            .map(b => b.toString(36))
            .join('')
            .slice(0, length);
    }

    verifyData() {
        if (isEmpty(this.reviewObject)) {
            showToast(
                this,
                'Missing SObject Selection For Review Process',
                'Please ensure all required fields are correctly filled out before retrying'
            );
        } else if (!this.hasValidFilter()) {
            showToast(
                this,
                'Missing Record Filtering For Review Process',
                'You must specify at least one filter. Please fill in the details and try again'
            );
        } else if (isEmpty(this.filterLogic)) {
            showToast(
                this,
                'Missing Filter Logic For Review Process',
                'Filter logic is missing. Use filter indexes to define it and try again'
            );
        }

        const filterLogicErrors = validateFilterLogicStructure(this.filterLogic);
        if (!isEmpty(filterLogicErrors)) {
            showToast(
                this,
                'Invalid Filter Logic For Review Process',
                'Please check the Filter Logic and try again'
            );

            const filterLogicInput = this.refs.filterLogic;
            filterLogicInput.setCustomValidity(filterLogicErrors[0]);
            filterLogicInput.reportValidity();
        }

        return true;
    }

    hasValidFilter() {
        return this.filters.some(filter => 
            filter.field?.trim() &&
            filter.value?.toString().trim() &&
            filter.selectedCondition?.trim()
        );
    }

    get isRemoveDisabled() {
        return isEmpty(this.filters) || this.filters.length === 1;
    }
}