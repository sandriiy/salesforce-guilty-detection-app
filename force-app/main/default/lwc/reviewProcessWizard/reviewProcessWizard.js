import { LightningElement, api, track, wire } from 'lwc';
import { getRecord } from "lightning/uiRecordApi";
import { showToast, isEmpty } from 'c/utils';

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

    processComponentConstructor;
    reviewSteps = REVIEW_PROCESS_INDICATOR_STEPS;
    isStepError = false;
    currentStep;

    @wire(getRecord, { recordId: "$recordId", fields: [REVIEW_ID, FILTER_CRITERIA, REVIEW_FIELDS, REVIEW_STATUS] })
    wiredRecord({ error, data }) {
        if (data) {
            this.record = data;
            this.determineReviewProgressStep();
        } else if (error) {
            // toast message
        }
    }

    handleStepClick(event) {
        const stepValue = event.target.value;
        if (this.isSwitchAllowed(stepValue)) {
            const progressStep = this.reviewSteps.find(step => step.value === stepValue);
            this.loadComponent(progressStep);
            this.currentStep = progressStep.value;
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
        }

        const currentProgressStep = this.reviewSteps.find(step => step.key === progressStepKey);
        this.loadComponent(currentProgressStep);
        this.currentStep = currentProgressStep.value;
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

    get isLoading() {
        return isEmpty(this.currentStep) || isEmpty(this.record)
    }
}