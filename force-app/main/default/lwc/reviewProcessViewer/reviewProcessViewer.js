import { LightningElement, track, api, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import { showToast, isEmpty } from 'c/utils';

import getNextStep from '@salesforce/apex/ReviewProcessController.getReviewProcessNextStep';
import TOTAL_REVIEWABLE_FIELD from '@salesforce/schema/ReviewProcess__c.TotalReviewableRecords__c';

const DEFAULT_EMPTY = 'N/A';
const FIELDS = [TOTAL_REVIEWABLE_FIELD];
export default class ReviewProcessViewer extends LightningElement {
    @api recordId;
    @track isLoading = false;

    @track totalNumberOfRecords = DEFAULT_EMPTY
    @track totalNumberOfReviewers = DEFAULT_EMPTY
    @track nextStep = DEFAULT_EMPTY
    @track nextStepStyle;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    recordHandler({ error, data }) {
        if (data) {
            let totalRecords = data.fields.TotalReviewableRecords__c.value;
            if (!isEmpty(totalRecords)) {
                this.totalNumberOfRecords = totalRecords;
            }
        }
    }

    @wire(getNextStep, { reviewProcessId: '$recordId' })
    nextStepHandler({ error, data }) {
        if (data) {
            this.nextStep = data.name;
            this.nextStepStyle = data.isReady ? 'color: #6cc230;' : 'color: #c03030;';
        }
    }
}
