import { LightningElement, api, track } from 'lwc';

import searchSobjects from '@salesforce/apex/ReviewProcessController.getSObjectsBySearch';
import getSobjectFields from '@salesforce/apex/ReviewProcessController.getAllSObjectFields';
import getPicklistValues from '@salesforce/apex/ReviewProcessController.getPicklistValues';

import { showToast, isEmpty, getFieldTypeConditions, getFieldTypeForInput } from 'c/utils';

export default class ReviewProcessRecordFilter extends LightningElement {
    @api record;

    reviewObject;
    @track sObjectOptions = [];
    @track fieldOptions = [];
    @track filters = [];

    handleObjectSearch(event) {
        const searchResult = event.detail.value;
        searchSobjects({ searchQuery: searchResult })
            .then((data) => {
                this.sObjectOptions = this.filterSobjectOptions(data);
                
                const customCombobox = this.template.querySelector('c-combobox[data-id="selectobject"]');
                customCombobox.processSearchResult(this.sObjectOptions);
            })
            .catch((error) => {
                console.log('AAAAAAAAAAAAAA1')
                console.log(error);
                // toast message
            });
    }

    handleObjectSelectChange(event) {
        this.reviewObject = event.detail.value;
        console.log(this.reviewObject);
        getSobjectFields({ sObjectName: this.reviewObject })
            .then((data) => {
                this.fieldOptions = this.filterSobjectFieldOptions(data);
                this.addNewFilterCondition();
            })
            .catch((error) => {
                console.log('AAAAAAAAAAAAAA2')
                this.reviewObject = undefined;
                // remove picklist value
                console.log(error);
                // toast message
            });
    }

    handleFilterFieldChange(event) {
        console.log('CHANGE FIELD');
        const selectedField = event.target.value;
        console.log(selectedField);
        const selectedFieldType = this.getFieldType(selectedField);
        console.log(selectedFieldType);

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
        console.log(JSON.stringify(selectedFilter));
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
        console.log(selectedFilter.value);
    }

    handleAddFilter(event) {
        this.addNewFilterCondition();
    }

    handleRemoveFilter(event) {
        const parentContainer = event.target.closest('div[data-index]');
        const parentContainerIndex = parentContainer.getAttribute('data-index');
        this.filters.splice(parentContainerIndex, 1);
    }

    handleFilterStepSave(event) {
        
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
                    console.log('PICKLIST RESULT');
                    filter.options = data;
                    console.log(data);
                    console.log(filter.options);
                })
                .catch((error) => {
                    console.log('AAAAAAAAAAAAAA2');
                    // remove picklist value
                    console.log(error);
                    // toast message
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
    }

    get isRemoveDisabled() {
        return isEmpty(this.filters) || this.filters.length === 1;
    }
}