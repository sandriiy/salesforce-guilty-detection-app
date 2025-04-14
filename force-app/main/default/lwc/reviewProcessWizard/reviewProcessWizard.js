import { LightningElement, api, track, wire } from 'lwc';
import { getRecord } from "lightning/uiRecordApi";
import { showToast, isEmpty } from 'c/utils';

import saveReviewProcessFilter from '@salesforce/apex/ReviewProcessController.saveReviewProcessFilter';

import REVIEW_ID from '@salesforce/schema/ReviewProcess__c.Id';
import FILTER_CRITERIA from "@salesforce/schema/ReviewProcess__c.FilterCriteria__c";
import REVIEW_FIELDS from "@salesforce/schema/ReviewProcess__c.FieldsForReview__c";
import REVIEW_STATUS from "@salesforce/schema/ReviewProcess__c.Status__c";

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

    @wire(getRecord, { recordId: "$recordId", fields: [REVIEW_ID, FILTER_CRITERIA, REVIEW_FIELDS, REVIEW_STATUS] })
    wiredRecord({ error, data }) {
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

    async handleStepSave(event) {
        const receivedData = event.detail;
        if (!isEmpty(receivedData)) {
            this.isManualLoading = true;

            let isSuccessful = false;
            if (this.currentStepKey === 'noFilterCriteria') {
                isSuccessful = await this.saveRecordFilterStepData(receivedData);
            } else if (this.currentStepKey === 'noReviewFields') {
                // ...
            }

            if (isSuccessful) {
                this.determineReviewProgressStep();
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
        return await saveReviewProcessFilter({ reviewProcessId: this.recordId, compiledData: compiledData })
            .then(() => {
                this.record.fields.FilterCriteria__c.value = compiledData;
                return true;
            })
            .catch((error) => {
                console.error(error);
                showToast(
                    this,
                    'Unable To Save Review Process Filters',
                    'Please try again or contact your System Administrator',
                    'error'
                );
            });
    }

    get isLoading() {
        return isEmpty(this.currentStep) || isEmpty(this.record) || this.isManualLoading === true;
    }
}