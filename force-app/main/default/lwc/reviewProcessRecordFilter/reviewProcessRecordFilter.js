import { LightningElement, api, track } from 'lwc';

import searchSobjects from '@salesforce/apex/ReviewProcessController.getSObjectsBySearch';
import getSobjectFields from '@salesforce/apex/ReviewProcessController.getAllSObjectFields';
import getPicklistValues from '@salesforce/apex/ReviewProcessController.getPicklistValues';

import { BOOLEAN_AS_PICKLIST_VALUES } from 'c/utils';
import { showToast, isEmpty, getFieldTypeConditions, getFieldTypeForInput, generateId } from 'c/utils';
import { validateFilterLogicStructure, validateFilterLogic, autoUpdateFilterLogic, recalculateFilterLogic } from 'c/filterLogicUtils';

export default class ReviewProcessRecordFilter extends LightningElement {
    @api record;
    @api stepKey;

    isLoading = false;
    reviewObject;
    @track sObjectOptions = [];
    @track fieldOptions = [];
    @track filters = [];

    filterLogic = '';
    filterLogicValidity = true;

    async connectedCallback() {
        this.isLoading = true;
        await this.resolveDataPopulation();
        this.isLoading = false;
    }

    handleObjectSearch(event) {
        const searchResult = event.detail.value;
        this.resolveSearchQuery(searchResult);
    }

    handleObjectSelectChange(event) {
        this.reviewObject = event.detail.value;
        this.clearReviewProcessFiltering();
        this.resolveSobjectFieldsSearch();
        this.addNewFilterCondition(); 
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
        const isVerifiedData = this.verifyData();
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
                type: getFieldTypeForInput(field.type),
                isBoolean: field.type === 'BOOLEAN'
            };
        });
    }

    getFieldType(fieldName) {
        const field = this.fieldOptions.find(field => field.value === fieldName);
        return field ? field.type : 'text';
    }

    resolveSearchQuery(searchQuery) {
        searchSobjects({ searchQuery: searchQuery })
            .then((data) => {
                this.sObjectOptions = this.filterSobjectOptions(data);
                
                const customCombobox = this.template.querySelector('c-combobox[data-id="selectobject"]');
                customCombobox.processSearchResult(this.sObjectOptions);
            })
            .catch((error) => {
                console.error(error);
            });
    }

    async resolveSobjectFieldsSearch() {
        await getSobjectFields({ sObjectName: this.reviewObject })
            .then((data) => {
                this.fieldOptions = this.filterSobjectFieldOptions(data);
            })
            .catch((error) => {
                this.reviewObject = undefined;
                console.error(error);
            });
    }
    
    resolveFieldReferences(filter) {
        const field = this.fieldOptions.find(field => field.value === filter.field);

        if (filter.type === 'lookup') {
            filter.isLookup = true;
            filter.lookupTo = field.lookupTo;
        } else if (field.isBoolean === true) {
            filter.isPicklist = true;
            filter.options = BOOLEAN_AS_PICKLIST_VALUES;
        } else if (filter.type === 'picklist' && field.type !== 'BOOLEAN') {
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

    async resolveDataPopulation() {
        const filterCriteria = this.record?.fields?.FilterCriteria__c?.value;
        if (!isEmpty(filterCriteria)) {
            const compiledData = JSON.parse(filterCriteria);
            this.reviewObject = compiledData.selectedSObject;
            this.filters = compiledData.selectedFilters;
            this.filterLogic = compiledData.selectedFilterLogic;

            if (!isEmpty(this.reviewObject)) {
                await this.resolveSobjectFieldsSearch();
            }

            if (isEmpty(this.filters)) {
                this.addNewFilterCondition(); 
            }
        }
    }

    compileFinalData() {
        return JSON.stringify({
            selectedSObject: this.reviewObject,
            selectedFilters: this.filters,
            selectedFilterLogic: this.filterLogic
        });
    }

    clearFilterReferences(filter) {
        filter.isLookup = false;
        filter.isPicklist = false;
        filter.options = [];
        filter.value = '';
        filter.selectedCondition = '';
    }

    clearReviewProcessFiltering() {
        this.filterLogicValidity = true;
        this.filters = [];
        this.filterLogic = '';
    }

    addNewFilterCondition() {
        this.filters.push({
            id: generateId(),
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

    notifyReviewProcessWizard(compiledFinalData) {
        this.dispatchEvent(new CustomEvent('stepsave', {
            detail: compiledFinalData
        }));
    }

    verifyData() {
        if (isEmpty(this.reviewObject)) {
            showToast(
                this,
                'Missing SObject Selection For Review Process',
                'Please ensure all required fields are correctly filled out before retrying'
            );
            return false;
        } else if (!this.hasValidFilter()) {
            showToast(
                this,
                'Missing Record Filtering For Review Process',
                'You must specify at least one filter. Please fill in the details and try again'
            );
            return false;
        } else if (isEmpty(this.filterLogic)) {
            showToast(
                this,
                'Missing Filter Logic For Review Process',
                'Filter logic is missing. Use filter indexes to define it and try again'
            );
            return false;
        }

        const filterLogicErrors = validateFilterLogicStructure(this.filterLogic);
        if (!isEmpty(filterLogicErrors) || this.filterLogicValidity === false) {
            showToast(
                this,
                'Invalid Filter Logic For Review Process',
                'Please check the Filter Logic and try again'
            );

            const filterLogicInput = this.refs.filterLogic;
            filterLogicInput.setCustomValidity(filterLogicErrors[0]);
            filterLogicInput.reportValidity();
            return false;
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