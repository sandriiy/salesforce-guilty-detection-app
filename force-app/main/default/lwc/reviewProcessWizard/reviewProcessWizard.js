import { LightningElement, api, track, wire } from 'lwc';
import { getRecord } from "lightning/uiRecordApi";
import { showToast, isEmpty, extractErrorMessage } from 'c/utils';

import reviewProcessRecordsPreview from 'c/reviewProcessRecordsPreview';
import saveReviewProcessFilter from '@salesforce/apex/ReviewProcessController.saveReviewProcessFilter';
import saveReviewProcessFields from '@salesforce/apex/ReviewProcessController.saveReviewProcessFields';

import REVIEW_ID from '@salesforce/schema/ReviewProcess__c.Id';
import FILTER_CRITERIA from "@salesforce/schema/ReviewProcess__c.FilterCriteria__c";
import REVIEW_FIELDS from "@salesforce/schema/ReviewProcess__c.FieldsForReview__c";
import REVIEW_STATUS from "@salesforce/schema/ReviewProcess__c.Status__c";

import { refreshApex } from '@salesforce/apex';

const REVIEW_PROCESS_INDICATOR_STEPS = [
    {
        key: "noFilterCriteria", 
        label: "Define Records Type", 
        value: "step1",
        importer: () => import("c/reviewProcessRecordFilter")
    },
    {
        key: "noReviewFields", 
        label: "Define Review Fields", 
        value: "step2",
        importer: () => import("c/reviewProcessFieldPicker")
    }
];

export default class ReviewProcessWizard extends LightningElement {
    @api record;
    @api recordId;

    isManualLoading = false;
    processComponentConstructor;
    reviewSteps = REVIEW_PROCESS_INDICATOR_STEPS;
    isStepError = false;
    currentStep;
    currentStepKey;

    wiredRecordResult;
    @wire(getRecord, { recordId: '$recordId', fields: [REVIEW_ID, FILTER_CRITERIA, REVIEW_FIELDS, REVIEW_STATUS] })
    wiredRecord(result) {
        this.wiredRecordResult = result;

        const {data, error} = result;
        if (data) {
            this.record = data;
            this.determineReviewProgressStep();
        } else if (error) {
            console.error(error);
            showToast(
                this,
                'Unable To Retrieve Review Process Record',
                'For more information, contact your System Administrator',
                'error'
            );
        }
    }

    handleStepClick(event) {
        const stepValue = event.target.value;
        if (this.isSwitchAllowed(stepValue)) {
            const progressStep = this.reviewSteps.find(step => step.value === stepValue);
            this.loadComponent(progressStep);
            this.currentStep = progressStep.value;
            this.currentStepKey = progressStep.key;
        }
    }

    async handleStepBack(event) {
        const currentIndex = this.reviewSteps.findIndex(step => step.key === this.currentStepKey);
        if (currentIndex > 0) {
            this.isManualLoading = true;
            const previousStep = this.reviewSteps[currentIndex - 1];
            this.loadComponent(previousStep);
            this.currentStep = previousStep.value;
            this.currentStepKey = previousStep.key;
            this.isManualLoading = false;
        }
    }

    async handleStepSave(event) {
        const receivedData = event.detail;
        if (!isEmpty(receivedData)) {
            this.isManualLoading = true;

            if (this.currentStepKey === 'noFilterCriteria') {
                await this.saveRecordFilterStepData(receivedData);
            } else if (this.currentStepKey === 'noReviewFields') {
                await this.saveRecordFieldsStepData(receivedData);
            }

            this.isManualLoading = false;
        } else {
            console.error(`Received data missing for ${this.currentStepKey}`);
        }
    }

    determineReviewProgressStep() {
        const filterCriteria = this.record?.fields?.FilterCriteria__c?.value;
        const reviewFields = this.record?.fields?.FieldsForReview__c?.value;

        let progressStepKey;
        if (isEmpty(filterCriteria)) {
            progressStepKey = 'noFilterCriteria';
        } else if (isEmpty(reviewFields)) {
            progressStepKey = 'noReviewFields';
        } else {
            progressStepKey = 'noReviewFields'; // default
        }

        const currentProgressStep = this.reviewSteps.find(step => step.key === progressStepKey);
        this.loadComponent(currentProgressStep);
        this.currentStep = currentProgressStep.value;
        this.currentStepKey = currentProgressStep.key;
    }

    loadComponent(currentProgressStep) {
        if (currentProgressStep?.importer) {
            currentProgressStep.importer()
                .then(({ default: ctor }) => this.processComponentConstructor = ctor)
                .catch((err) => console.error(`Error importing ${currentProgressStep.value}:`, err));
        } else {
            console.error(`Importer function missing for ${currentProgressStep?.value}`);
        }
    }

    isSwitchAllowed(newStepValue) {
        if (this.currentStep === newStepValue) {
            return false;
        }

        return true;
    }

    async saveRecordFilterStepData(compiledData) {
        try {
            await saveReviewProcessFilter({ reviewProcessId: this.recordId, compiledData: compiledData });
            showToast(this, 'Review Process Filtering Successfully Saved', '', 'success');

            const previewResult = await reviewProcessRecordsPreview.open({
				reviewProcessId: this.recordId,
                label: 'Filtered Records Preview',
                size: 'small',
                content: 'You\'re viewing a preview of records based on your current setup.',
				isConfigPreview: true,
				isTotalRecords: true,
				filters: compiledData
            });

            if (previewResult === 'okay') {
                await refreshApex(this.wiredRecordResult);
            }
        } catch (error) {
            console.error(error);
            showToast(
                this,
                'Unable To Save Review Process Filters',
                extractErrorMessage(error),
                'error'
            );
        }
    }

    async saveRecordFieldsStepData(compiledData) {
        try {
            await saveReviewProcessFields({ reviewProcessId: this.recordId, compiledData: compiledData });
            await refreshApex(this.wiredRecordResult);
            showToast(
                this,
                'Review Process Fields Successfully Saved',
                'You have successfully specified all the configuration. Just a little more to go',
                'success'
            );
        } catch (error) {
            console.error(error);
            showToast(
                this,
                'Unable To Save Review Process Fields',
                'Please try again or contact your System Administrator',
                'error'
            );
        }
    }

    get isLoading() {
        return isEmpty(this.currentStep) || isEmpty(this.record) || this.isManualLoading === true;
    }
}